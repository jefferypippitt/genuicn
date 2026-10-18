import { z } from "zod";
import { CUP_GROUPS } from "@/features/nba-cup/nba-cup-schema";

export const nbaCupCatalogEntry = {
  description:
    "One NBA Cup group's table this season: its five teams in order, with games played, wins, losses, points for and against, and the point difference. It fetches its own data. Use it whenever the user asks about the NBA Cup (also called the In-Season Tournament), its group stage, or a Cup group. For one group (\"West Group A\"), show that group. For a conference's Cup groups, show its three in a CardGroup, A first. For the whole NBA Cup, show all six in a CardGroup: East A, B, C, then West A, B, C. For one team's Cup group, show the group it plays in.",
  props: z.object({
    group: z
      .enum(CUP_GROUPS)
      .describe(
        'The group: "east-a", "east-b" or "east-c" in the East, "west-a", "west-b" or "west-c" in the West.'
      ),
  }),
};
