import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';

export default function ApplyBySlug() {
  const { slug } = useParams<{ slug: string }>();
  const [clubId, setClubId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }

    (async () => {
      // If it looks like a UUID, use directly
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      if (isUUID) { setClubId(slug); setLoading(false); return; }

      try {
        const { dataClient } = await import('@/integrations/supabase/dataClient');
        // Convert slug to name: "startup-incubator" → "startup incubator"
        const nameGuess = slug.replace(/-/g, ' ');
        const { data } = await dataClient
          .from('clubs')
          .select('id')
          .ilike('name', nameGuess)
          .maybeSingle();
        if (data?.id) {
          setClubId(data.id);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div style={{ background: '#0A0A0A', minHeight: '100vh' }}>
        <Header />
        <div className="flex items-center justify-center pt-40">
          <Loader2 className="w-6 h-6 text-gold animate-spin" />
        </div>
      </div>
    );
  }

  if (notFound || !clubId) return <Navigate to="/clubs" replace />;
  return <Navigate to={`/clubs/${clubId}/apply`} replace />;
}
