import { Mail, Linkedin, Github, Globe, CalendarDays, Phone, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { BoardMember } from '@/hooks/useClubBoard';

interface LinkChip {
  href: string;
  icon: React.ElementType;
  label: string;
  bg: string;
  fg: string;
}

interface TeamMemberCardProps {
  member: BoardMember;
  /** internal = show phone + all links; public = show email, linkedin, github, portfolio only */
  variant?: 'internal' | 'public';
}

export function TeamMemberCard({ member, variant = 'public' }: TeamMemberCardProps) {
  const initials = (member.display_name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const links: LinkChip[] = [];

  if (member.email) {
    links.push({
      href: `mailto:${member.email}`,
      icon: Mail,
      label: 'Email',
      bg: 'bg-orange-500/15 hover:bg-orange-500/30',
      fg: 'text-orange-400',
    });
  }
  if (member.linkedin_url) {
    links.push({
      href: member.linkedin_url,
      icon: Linkedin,
      label: 'LinkedIn',
      bg: 'bg-blue-500/15 hover:bg-blue-500/30',
      fg: 'text-blue-400',
    });
  }
  if (member.github_url) {
    links.push({
      href: member.github_url,
      icon: Github,
      label: 'GitHub',
      bg: 'bg-zinc-700/60 hover:bg-zinc-600/70',
      fg: 'text-zinc-300',
    });
  }
  if (member.portfolio_url) {
    links.push({
      href: member.portfolio_url,
      icon: Globe,
      label: 'Portfolio',
      bg: 'bg-emerald-500/15 hover:bg-emerald-500/30',
      fg: 'text-emerald-400',
    });
  }
  if (member.calendly_url) {
    links.push({
      href: member.calendly_url,
      icon: CalendarDays,
      label: 'Calendly',
      bg: 'bg-gold/10 hover:bg-gold/20',
      fg: 'text-gold',
    });
  }
  if (variant === 'internal' && member.phone) {
    links.push({
      href: `tel:${member.phone}`,
      icon: Phone,
      label: 'Phone',
      bg: 'bg-purple-500/15 hover:bg-purple-500/30',
      fg: 'text-purple-400',
    });
  }

  return (
    <div className="group flex flex-col items-center text-center rounded-2xl border border-white/[0.07] bg-zinc-900/60 hover:bg-zinc-900 hover:border-white/[0.12] transition-all duration-200 p-5">
      {/* Photo */}
      <div className="relative mb-4">
        <Avatar className="w-24 h-24 rounded-2xl border border-white/10">
          <AvatarImage src={member.avatar_url || undefined} className="object-cover" />
          <AvatarFallback className="rounded-2xl bg-gold/10 text-gold text-lg font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        {member.memberRole === 'owner' && (
          <div
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gold flex items-center justify-center"
            title="Club Owner"
          >
            <ShieldCheck className="w-3 h-3 text-zinc-950" />
          </div>
        )}
      </div>

      {/* Name + role */}
      <p className="text-sm font-bold text-white tracking-wide uppercase leading-tight mb-0.5">
        {member.display_name || 'Team Member'}
      </p>
      <p className="text-[11px] text-zinc-500 mb-1">{member.role_title || ''}</p>

      {/* Academic (internal only) */}
      {variant === 'internal' && (member.major || member.graduation_year) && (
        <p className="text-[10px] text-zinc-600 mb-3">
          {[member.major, member.graduation_year ? `'${member.graduation_year.slice(-2)}` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}

      {/* Bio */}
      {member.bio && (
        <p className="text-[11px] text-zinc-500 line-clamp-2 mb-3 leading-relaxed">{member.bio}</p>
      )}

      {/* Link buttons */}
      {links.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-auto pt-3">
          {links.map(({ href, icon: Icon, label, bg, fg }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith('mailto') || href.startsWith('tel') ? undefined : '_blank'}
              rel="noopener noreferrer"
              title={label}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${bg}`}
            >
              <Icon className={`w-3.5 h-3.5 ${fg}`} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
