import { memo } from "react";
import { BagOutcomePreview } from "@/components/app/bag-outcome-preview/bag-outcome-preview";
import { calculateBagPatternPlan } from "@/lib/sewing/bag-pattern";
import { calculateBoxyBagPlan } from "@/lib/sewing/boxy-bag";
import { calculateOuterPanelComposition } from "@/lib/sewing/panel-composition";
import { type BagStudioSnapshot } from "@/lib/sewing/bag-studio-storage";
import { outerDesignForBody } from "../utils";

export const SavedBagThumbnail = memo(function SavedBagThumbnail({
      snapshot,
    }: {
      snapshot: BagStudioSnapshot;
    }) {
      const plan = snapshot.bodyRecipe === "four-corner-boxy"
        ? calculateBoxyBagPlan(snapshot.boxyDraft)
        : calculateBagPatternPlan(snapshot.draft);
      const composition = calculateOuterPanelComposition(
        plan,
        outerDesignForBody(snapshot.bodyRecipe, snapshot.outerDesign),
      );

      return (
        <BagOutcomePreview
          variant="thumbnail"
          bodyRecipe={snapshot.bodyRecipe}
          plan={plan}
          closure={snapshot.closure}
          options={snapshot.closureOptions}
          composition={composition}
          yaw={snapshot.previewYaw}
        />
      );
    });
