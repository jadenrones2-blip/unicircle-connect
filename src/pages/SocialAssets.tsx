import { Button } from '@/components/ui/button';
import { Download, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import igCarousel1 from '@/assets/social/ig-carousel-1-hero.png';
import igCarousel2 from '@/assets/social/ig-carousel-2-feature.png';
import igCarousel3 from '@/assets/social/ig-carousel-3-cta.png';
import linkedinBanner from '@/assets/social/linkedin-banner.png';
import storyCover1 from '@/assets/social/story-cover-1.png';
import storyCover2 from '@/assets/social/story-cover-2-cta.png';

const assets = [
  {
    src: igCarousel1,
    name: 'ig-carousel-1-hero.png',
    label: 'IG Carousel — Hero',
    size: '1080×1080',
  },
  {
    src: igCarousel2,
    name: 'ig-carousel-2-feature.png',
    label: 'IG Carousel — Feature',
    size: '1080×1080',
  },
  {
    src: igCarousel3,
    name: 'ig-carousel-3-cta.png',
    label: 'IG Carousel — CTA',
    size: '1080×1080',
  },
  { src: linkedinBanner, name: 'linkedin-banner.png', label: 'LinkedIn Banner', size: '1920×1080' },
  { src: storyCover1, name: 'story-cover-1.png', label: 'Story Cover — Hook', size: '1080×1920' },
  {
    src: storyCover2,
    name: 'story-cover-2-cta.png',
    label: 'Story Cover — CTA',
    size: '1080×1920',
  },
];

const handleDownload = (src: string, name: string) => {
  const link = document.createElement('a');
  link.href = src;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const SocialAssets = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-5 py-8 max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Social Media Assets
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Click any asset to download</p>
          </div>
        </div>

        {/* Square assets */}
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">
          Instagram Carousel
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {assets.slice(0, 3).map((asset) => (
            <AssetCard key={asset.name} asset={asset} />
          ))}
        </div>

        {/* LinkedIn banner */}
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">LinkedIn</h2>
        <div className="mb-10">
          <AssetCard asset={assets[3]} wide />
        </div>

        {/* Story covers */}
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Story Covers</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {assets.slice(4).map((asset) => (
            <AssetCard key={asset.name} asset={asset} />
          ))}
        </div>
      </div>
    </div>
  );
};

const AssetCard = ({ asset, wide }: { asset: (typeof assets)[0]; wide?: boolean }) => (
  <div
    className={`group rounded-lg border border-border bg-card overflow-hidden ${wide ? 'max-w-3xl' : ''}`}
  >
    <div className="relative overflow-hidden bg-muted">
      <img src={asset.src} alt={asset.label} className="w-full h-auto object-cover" />
      <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Button variant="gold" size="sm" onClick={() => handleDownload(asset.src, asset.name)}>
          <Download className="w-4 h-4 mr-2" /> Download
        </Button>
      </div>
    </div>
    <div className="p-3 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">{asset.label}</p>
        <p className="text-xs text-muted-foreground">{asset.size}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => handleDownload(asset.src, asset.name)}
      >
        <Download className="w-4 h-4" />
      </Button>
    </div>
  </div>
);

export default SocialAssets;
