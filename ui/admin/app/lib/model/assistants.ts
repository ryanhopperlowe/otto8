import { AgentIcons } from "~/lib/model/agents";
import { EntityMeta } from "~/lib/model/primitives";

export type Assistant = EntityMeta & {
    name: string;
    entityId: string;
    description: string;
    icons: AgentIcons;
    type: "agent" | "workflow";
};
