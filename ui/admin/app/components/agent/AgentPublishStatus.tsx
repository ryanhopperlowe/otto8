import { Link } from "@remix-run/react";
import { useMemo } from "react";
import { $path } from "remix-routes";
import useSWR from "swr";

import { AgentBase } from "~/lib/model/agents";
import { AssistantApiService } from "~/lib/service/api/assistantApiService";

import { TypographySmall } from "~/components/Typography";
import { Publish } from "~/components/agent/Publish";
import { Unpublish } from "~/components/agent/Unpublish";
import { CopyText } from "~/components/composed/CopyText";

type AgentPublishStatusProps = {
    agent: AgentBase;
    onChange: (agent: Partial<AgentBase>) => void;
};

export function AgentPublishStatus({
    agent,
    onChange,
}: AgentPublishStatusProps) {
    const getAssistants = useSWR(
        () =>
            agent.refName && !agent.refNameAssigned
                ? AssistantApiService.getAssistants.key()
                : null,
        () => AssistantApiService.getAssistants()
    );

    const refAgent = useMemo(() => {
        if (!getAssistants.data) return null;

        return getAssistants.data.find(({ id }) => id === agent.refName);
    }, [getAssistants.data, agent.refName]);

    return (
        <div className="flex w-full justify-between px-8 pt-4 items-center gap-4">
            {renderAgentRef()}

            {agent.refName ? (
                <Unpublish onUnpublish={() => onChange({ refName: "" })} />
            ) : (
                <Publish
                    refName={agent.refName}
                    onPublish={(refName) => onChange({ refName })}
                />
            )}
        </div>
    );

    function renderAgentRef() {
        if (!agent.refName) return <div />;

        if (refAgent) {
            const route =
                refAgent.type === "agent"
                    ? $path("/agents/:agent", {
                          agent: refAgent.entityID,
                      })
                    : $path("/workflows/:workflow", {
                          workflow: refAgent.entityID,
                      });

            return (
                <div className="flex flex-col gap-1 h-full">
                    <div className="flex items-center gap-2">
                        <div className="size-2 bg-warning rounded-full" />
                        <TypographySmall>Unavailable</TypographySmall>
                    </div>

                    <TypographySmall className="pb-0 text-muted-foreground">
                        <span className="min-w-fit">
                            Ref name <b>{refAgent.id}</b> used by{" "}
                        </span>
                        <Link
                            className="text-accent-foreground underline"
                            to={route}
                        >
                            {refAgent.name}
                        </Link>
                    </TypographySmall>
                </div>
            );
        }

        if (!agent.refNameAssigned) return <div />;

        return (
            <CopyText
                className="h-8 text-muted-foreground text-sm bg-background flex-row-reverse"
                holdStatusDelay={10000}
                text={`${window.location.protocol}//${window.location.host}/${agent.refName}`}
            />
        );
    }
}
