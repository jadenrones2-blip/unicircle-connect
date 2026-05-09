import { Composition } from "remotion";
import { UniCirclePromo } from "./compositions/UniCirclePromo";
import { UniCircleShort } from "./compositions/UniCircleShort";
import { ClubLeaderHook } from "./compositions/ClubLeaderHook";
import { UniCirclePitchDemo } from "./compositions/UniCirclePitchDemo";

export const Root: React.FC = () => {
  return (
    <>
      {/* 30s landscape promo — for YouTube, website embed */}
      <Composition
        id="UniCirclePromo"
        component={UniCirclePromo}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
      />
      {/* 15s vertical short — for Instagram Reels, TikTok */}
      <Composition
        id="UniCircleShort"
        component={UniCircleShort}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* 15s vertical — club leader recruitment pain points hook */}
      <Composition
        id="ClubLeaderHook"
        component={ClubLeaderHook}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* 45s landscape — investor + LinkedIn pitch demo */}
      <Composition
        id="UniCirclePitchDemo"
        component={UniCirclePitchDemo}
        durationInFrames={1350}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
