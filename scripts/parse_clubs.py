#!/usr/bin/env python3
"""Parse raw_club_pages_rows.sql and generate INSERT statements for the clubs table."""

import re
import sys
import uuid

def escape_sql(s):
    """Escape single quotes for SQL."""
    return s.replace("'", "''")

def extract_club_data(text):
    """Extract structured club data from a raw club page text blob."""
    lines = text.split('\n')

    name = None
    category = None
    description = None
    email = None
    instagram = None
    website = None

    for i, line in enumerate(lines):
        line = line.strip()

        # Club name: first line after "CSI Student Organizations UC San Diego"
        if 'CSI Student Organizations UC San Diego' in line and name is None:
            # Next non-empty line is the club name
            for j in range(i + 1, min(i + 3, len(lines))):
                candidate = lines[j].strip()
                if candidate and 'Category' not in candidate:
                    name = candidate
                    break

        # Category: line ending with "Category"
        if line.endswith('Category') and category is None:
            category = line.replace('Category', '').strip()

        # Description: extract from "Purpose ... Created" pattern
        if 'Purpose' in line and description is None:
            match = re.search(r'Purpose\s+(.+?)\s+Created\s', line)
            if match:
                description = match.group(1).strip()

        # Email: "Organization Email xxx@xxx"
        if 'Organization Email' in line and email is None:
            match = re.search(r'Organization Email\s+(\S+@\S+)', line)
            if match:
                email = match.group(1).strip()

        # Instagram
        if 'Instagram:' in line and instagram is None:
            match = re.search(r'Instagram:\s*(@?\S+)', line)
            if match:
                instagram = match.group(1).strip().rstrip(',')

        # Website
        if 'Website:' in line and website is None:
            match = re.search(r'Website:\s*(\S+)', line)
            if match:
                website = match.group(1).strip().rstrip(',')

    if not name:
        return None

    return {
        'name': name,
        'category': category,
        'description': description,
        'email': email,
        'instagram': instagram,
        'website': website,
    }

def categorize_bucket(category):
    """Map detailed categories to broader buckets for filtering."""
    if not category:
        return None
    cat = category.lower()
    if any(t in cat for t in ['interfraternity', 'ifc']):
        return 'Fraternity'
    if any(t in cat for t in ['college panhellenic', 'cpa']):
        return 'Sorority'
    if any(t in cat for t in ['multicultural greek council']) and 'fraternity' in cat:
        return 'Fraternity'
    if any(t in cat for t in ['multicultural greek council']) and 'sorority' in cat:
        return 'Sorority'
    if 'nphc' in cat or 'pan-hellenic' in cat:
        return 'Greek Life'
    if 'cultural' in cat:
        return 'Cultural'
    if 'academic' in cat:
        return 'Academic'
    if 'pre-professional' in cat or 'health professions' in cat:
        return 'Professional'
    if 'service' in cat or 'changemaking' in cat:
        return 'Service'
    if 'political' in cat:
        return 'Social'
    if 'social' in cat:
        return 'Social'
    if 'spiritual' in cat:
        return 'Spiritual'
    if 'dance' in cat or 'music' in cat or 'performance' in cat:
        return 'Social'
    if 'media' in cat:
        return 'Social'
    if 'martial arts' in cat or 'combatives' in cat or 'sport' in cat:
        return 'Sports'
    if 'cooperative' in cat:
        return 'Social'
    if 'educational' in cat:
        return 'Academic'
    if 'saac' in cat or 'affirmative' in cat:
        return 'Cultural'
    return 'Social'

def main():
    with open('scripts/raw_club_pages_rows.sql', 'r') as f:
        content = f.read()

    # Split into individual row entries
    # Each row starts with ('id', 'timestamp', 'url', 'source', 'text...')
    # Split on the row separator pattern
    pattern = r"\('(\d+)',\s*'([^']*)',\s*'([^']*)',\s*'''([^']*)''',\s*'(.*?)'\)"

    # Use a simpler approach: split on '), ( which separates rows
    # First remove the INSERT INTO prefix
    rows_text = content.split("VALUES ", 1)[1] if "VALUES " in content else content

    # Split rows by '), ('
    raw_rows = rows_text.split("'), ('")

    clubs = []
    seen_names = set()

    for i, raw_row in enumerate(raw_rows):
        # Skip the first row (directory listing, not a club detail page)
        if i == 0:
            continue

        # Extract the text field (5th column)
        parts = raw_row.split("', '")
        if len(parts) < 4:
            continue

        # The text is the last part, may have trailing ');\n or ');
        text = parts[-1]
        text = text.rstrip("');").rstrip("')").rstrip()

        club = extract_club_data(text)
        if club and club['name'] not in seen_names:
            seen_names.add(club['name'])
            club['category_bucket'] = categorize_bucket(club['category'])
            clubs.append(club)

    # Generate SQL
    print("-- Auto-generated from raw_club_pages_rows.sql")
    print(f"-- {len(clubs)} clubs extracted\n")
    print("INSERT INTO public.clubs (name, category, category_bucket, description, email, instagram, website) VALUES")

    values = []
    for club in clubs:
        name = escape_sql(club['name'])
        category = escape_sql(club['category'] or '')
        category_bucket = escape_sql(club['category_bucket'] or '')
        description = escape_sql(club['description'] or '')
        email_val = escape_sql(club['email'] or '')
        instagram_val = escape_sql(club['instagram'] or '')
        website_val = escape_sql(club['website'] or '')

        values.append(
            f"  ('{name}', NULLIF('{category}', ''), NULLIF('{category_bucket}', ''), "
            f"NULLIF('{description}', ''), NULLIF('{email_val}', ''), "
            f"NULLIF('{instagram_val}', ''), NULLIF('{website_val}', ''))"
        )

    print(",\n".join(values) + ";")

    print(f"\n-- Summary: {len(clubs)} clubs", file=sys.stderr)

if __name__ == '__main__':
    main()
