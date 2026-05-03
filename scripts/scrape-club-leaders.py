#!/usr/bin/env python3
"""
Scrapes UCSD student org directory (studentorg.ucsd.edu) and outputs a CSV
of club leaders with name, email, org name, category, org email, and Instagram.

Usage:
    python3 scripts/scrape-club-leaders.py
    python3 scripts/scrape-club-leaders.py --output leads.csv --delay 1.2

Output columns:
    org_name, category, org_email, instagram, officer_name, officer_email
"""

import argparse
import csv
import re
import sys
import time
from urllib.parse import urljoin

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Missing dependencies. Run: pip3 install requests beautifulsoup4")
    sys.exit(1)

BASE_URL = "https://studentorg.ucsd.edu"
LIST_URL = f"{BASE_URL}/Home"


def fetch(session, url, retries=3, delay=2):
    for attempt in range(retries):
        try:
            r = session.get(url, timeout=15)
            r.raise_for_status()
            return r.text
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(delay * (attempt + 1))
            else:
                print(f"  [FAIL] {url} — {e}", file=sys.stderr)
                return None


def get_org_ids(session):
    html = fetch(session, LIST_URL)
    if not html:
        return []
    soup = BeautifulSoup(html, "html.parser")
    ids = []
    for a in soup.find_all("a", href=re.compile(r"/Home/Details/\d+")):
        match = re.search(r"/Home/Details/(\d+)", a["href"])
        if match:
            ids.append(match.group(1))
    return list(dict.fromkeys(ids))  # dedupe, preserve order


def parse_detail(html, org_id):
    soup = BeautifulSoup(html, "html.parser")

    h1 = soup.find("h1")
    org_name = h1.get_text(strip=True) if h1 else ""

    # Category — inside <a href="/Home/Index/..."><h4>...</h4></a>
    cat_link = soup.find("a", href=re.compile(r"/Home/Index/\d+"))
    category = ""
    if cat_link:
        h4 = cat_link.find("h4")
        if h4:
            category = h4.get_text(strip=True).replace(" Category", "")

    # dl-horizontal key/value pairs
    dl = soup.find("dl", class_="dl-horizontal")
    org_email = ""
    instagram = ""
    if dl:
        dts = dl.find_all("dt")
        dds = dl.find_all("dd")
        for dt, dd in zip(dts, dds):
            key = dt.get_text(strip=True).lower()
            if "organization email" in key:
                a = dd.find("a", href=re.compile(r"^mailto:"))
                org_email = a.get_text(strip=True) if a else dd.get_text(strip=True)
            elif "social media" in key:
                instagram = dd.get_text(strip=True)

    # Principal members table
    table = soup.find("table", id="tblPrincipalMembers")
    members = []
    if table:
        for tr in table.find("tbody").find_all("tr"):
            tds = tr.find_all("td")
            if len(tds) >= 2:
                name = tds[0].get_text(strip=True)
                email = tds[1].get_text(strip=True)
                if name and email:
                    members.append((name, email))

    return org_name, category, org_email, instagram, members


def main():
    parser = argparse.ArgumentParser(description="Scrape UCSD club leaders")
    parser.add_argument("--output", default="ucsd_club_leaders.csv")
    parser.add_argument("--delay", type=float, default=1.0,
                        help="Seconds between requests (default 1.0)")
    parser.add_argument("--limit", type=int, default=0,
                        help="Max orgs to scrape (0 = all)")
    args = parser.parse_args()

    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0 (research/outreach)"})

    print("Fetching org list...")
    ids = get_org_ids(session)
    if args.limit:
        ids = ids[:args.limit]
    print(f"Found {len(ids)} orgs. Scraping detail pages...")

    rows = []
    for i, org_id in enumerate(ids, 1):
        url = f"{BASE_URL}/Home/Details/{org_id}"
        print(f"[{i}/{len(ids)}] {url}", end="  ", flush=True)

        html = fetch(session, url)
        if not html:
            continue

        org_name, category, org_email, instagram, members = parse_detail(html, org_id)
        print(f"{org_name[:50]}")

        if not members and not org_email:
            # No contact info — skip
            time.sleep(args.delay)
            continue

        if members:
            for name, email in members:
                rows.append({
                    "org_name": org_name,
                    "category": category,
                    "org_email": org_email,
                    "instagram": instagram,
                    "officer_name": name,
                    "officer_email": email,
                })
        else:
            # Org email only, no named officers
            rows.append({
                "org_name": org_name,
                "category": category,
                "org_email": org_email,
                "instagram": instagram,
                "officer_name": "",
                "officer_email": "",
            })

        time.sleep(args.delay)

    fieldnames = ["org_name", "category", "org_email", "instagram",
                  "officer_name", "officer_email"]
    with open(args.output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nDone. {len(rows)} rows written to {args.output}")
    unique_orgs = len({r["org_name"] for r in rows})
    print(f"Orgs with contact info: {unique_orgs}")
    emails = {r["officer_email"] or r["org_email"] for r in rows if r["officer_email"] or r["org_email"]}
    print(f"Unique email addresses: {len(emails)}")


if __name__ == "__main__":
    main()
