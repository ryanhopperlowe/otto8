import { PersonIcon, ReaderIcon } from "@radix-ui/react-icons";
import {
    ClientLoaderFunctionArgs,
    Link,
    useLoaderData,
    useNavigate,
    useSearchParams,
} from "@remix-run/react";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { PuzzleIcon, Trash, XIcon } from "lucide-react";
import { useCallback, useMemo } from "react";
import { $path } from "remix-routes";
import useSWR, { preload } from "swr";
import { z } from "zod";

import { Agent } from "~/lib/model/agents";
import { Thread } from "~/lib/model/threads";
import { User } from "~/lib/model/users";
import { Workflow } from "~/lib/model/workflows";
import { AgentService } from "~/lib/service/api/agentService";
import { ThreadsService } from "~/lib/service/api/threadsService";
import { UserService } from "~/lib/service/api/userService";
import { WorkflowService } from "~/lib/service/api/workflowService";
import { RouteService } from "~/lib/service/routeService";
import { timeSince } from "~/lib/utils";

import { TypographyH2, TypographyP } from "~/components/Typography";
import { DataTable } from "~/components/composed/DataTable";
import { Button } from "~/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "~/components/ui/tooltip";
import { useAsync } from "~/hooks/useAsync";

export type SearchParams = z.infer<(typeof RouteService.schemas)["/threads"]>;

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
    const search = new URL(request.url).search;

    await Promise.all([
        preload(AgentService.getAgents.key(), AgentService.getAgents),
        preload(
            WorkflowService.getWorkflows.key(),
            WorkflowService.getWorkflows
        ),
        preload(ThreadsService.getThreads.key(), ThreadsService.getThreads),
    ]);

    return RouteService.getQueryParams("/threads", search) ?? {};
}

export default function Threads() {
    const navigate = useNavigate();
    const { agentId, workflowId, userId } =
        useLoaderData<typeof clientLoader>();

    const getThreads = useSWR(
        ThreadsService.getThreads.key(),
        ThreadsService.getThreads
    );

    const getAgents = useSWR(
        AgentService.getAgents.key(),
        AgentService.getAgents
    );

    const getWorkflows = useSWR(
        WorkflowService.getWorkflows.key(),
        WorkflowService.getWorkflows
    );

    const getUsers = useSWR(UserService.getUsers.key(), UserService.getUsers);

    const agentMap = useMemo(() => {
        // note(tylerslaton): the or condition here is because the getAgents.data can
        // be an object containing a url only when switching to the agent page from the
        // threads page.
        if (!getAgents.data || !Array.isArray(getAgents.data)) return {};
        return getAgents.data.reduce(
            (acc, agent) => {
                acc[agent.id] = agent;
                return acc;
            },
            {} as Record<string, Agent>
        );
    }, [getAgents.data]);

    const workflowMap = useMemo(() => {
        if (!getWorkflows.data || !Array.isArray(getWorkflows.data)) return {};
        return getWorkflows.data.reduce(
            (acc, workflow) => {
                acc[workflow.id] = workflow;
                return acc;
            },
            {} as Record<string, Workflow>
        );
    }, [getWorkflows.data]);

    const userMap = useMemo(() => {
        if (!getUsers.data || !Array.isArray(getUsers.data)) return {};
        return getUsers.data.reduce(
            (acc, user) => {
                acc[user.id] = user;
                return acc;
            },
            {} as Record<string, User>
        );
    }, [getUsers.data]);

    const threads = useMemo(() => {
        if (!getThreads.data) return [];

        let filteredThreads = getThreads.data.filter(
            (thread) => thread.agentID || thread.workflowID
        );

        if (agentId) {
            filteredThreads = filteredThreads.filter(
                (thread) => thread.agentID === agentId
            );
        }

        if (workflowId) {
            filteredThreads = filteredThreads.filter(
                (thread) => thread.workflowID === workflowId
            );
        }

        if (userId) {
            filteredThreads = filteredThreads.filter(
                (thread) => thread.userID === userId
            );
        }

        return filteredThreads;
    }, [getThreads.data, agentId, workflowId, userId]);

    const deleteThread = useAsync(ThreadsService.deleteThread, {
        onSuccess: ThreadsService.revalidateThreads,
    });

    return (
        <div className="h-full flex flex-col">
            <div className="flex-auto flex flex-col overflow-hidden p-8 gap-4">
                <TypographyH2>Threads</TypographyH2>

                <ThreadFilters
                    userMap={userMap}
                    agentMap={agentMap}
                    workflowMap={workflowMap}
                />

                <DataTable
                    columns={getColumns()}
                    data={threads}
                    sort={[{ id: "created", desc: true }]}
                    classNames={{
                        row: "!max-h-[200px] grow-0 height-[200px]",
                        cell: "!max-h-[200px] grow-0 height-[200px]",
                    }}
                    disableClickPropagation={(cell) =>
                        cell.id.includes("actions")
                    }
                    onRowClick={(row) => {
                        navigate($path("/thread/:id", { id: row.id }));
                    }}
                />
            </div>
        </div>
    );

    function getColumns(): ColumnDef<Thread, string>[] {
        return [
            columnHelper.accessor(
                (thread) => {
                    if (thread.agentID)
                        return agentMap[thread.agentID]?.name ?? thread.agentID;
                    else if (thread.workflowID)
                        return (
                            workflowMap[thread.workflowID]?.name ??
                            thread.workflowID
                        );
                    return "Unnamed";
                },
                { header: "Name" }
            ),
            columnHelper.display({
                id: "type",
                header: "Type",
                cell: ({ row }) => {
                    return (
                        <TypographyP className="flex items-center gap-2">
                            {row.original.agentID ? (
                                <PersonIcon className="w-4 h-4" />
                            ) : (
                                <PuzzleIcon className="w-4 h-4" />
                            )}
                            {row.original.agentID ? "Agent" : "Workflow"}
                        </TypographyP>
                    );
                },
            }),
            columnHelper.accessor(
                (thread) =>
                    thread.userID ? userMap[thread.userID]?.email || "-" : "-",
                { header: "User" }
            ),
            columnHelper.accessor("created", {
                id: "created",
                header: "Created",
                cell: (info) => (
                    <TypographyP>
                        {timeSince(new Date(info.row.original.created))} ago
                    </TypographyP>
                ),
                sortingFn: "datetime",
            }),
            columnHelper.display({
                id: "actions",
                cell: ({ row }) => (
                    <div className="flex gap-2 justify-end">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" asChild>
                                    <Link
                                        to={$path("/thread/:id", {
                                            id: row.original.id,
                                        })}
                                    >
                                        <ReaderIcon width={21} height={21} />
                                    </Link>
                                </Button>
                            </TooltipTrigger>

                            <TooltipContent>
                                <p>Inspect Thread</p>
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                        deleteThread.execute(row.original.id)
                                    }
                                >
                                    <Trash />
                                </Button>
                            </TooltipTrigger>

                            <TooltipContent>
                                <p>Delete Thread</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                ),
            }),
        ];
    }
}

function ThreadFilters({
    userMap,
    agentMap,
    workflowMap,
}: {
    userMap: Record<string, User>;
    agentMap: Record<string, Agent>;
    workflowMap: Record<string, Workflow>;
}) {
    const [searchParams, setSearchParams] = useSearchParams();

    const removeParam = useCallback(
        (key: string) =>
            setSearchParams((prev) => {
                const params = new URLSearchParams(prev);
                params.delete(key);
                return params;
            }),
        [setSearchParams]
    );

    const filters = useMemo(() => {
        const threadFilters = {
            agentId: (value: string) => agentMap[value]?.name ?? value,
            userId: (value: string) => userMap[value]?.email ?? "-",
            workflowId: (value: string) => workflowMap[value]?.name ?? value,
        };

        const labels = {
            agentId: "Agent",
            userId: "User",
            workflowId: "Workflow",
        };

        const query = RouteService.getQueryParams(
            "/threads",
            searchParams.toString()
        );

        return Object.entries(query ?? {}).map(([key, value]) => ({
            key,
            label: labels[key as keyof SearchParams],
            value: threadFilters[key as keyof SearchParams](value),
            onRemove: () => removeParam(key),
        }));
    }, [agentMap, removeParam, searchParams, userMap, workflowMap]);

    return (
        <div className="flex gap-2">
            {filters.map((filter) => (
                <Button
                    key={filter.key}
                    size="badge"
                    onClick={filter.onRemove}
                    variant="secondary"
                    shape="pill"
                    endContent={<XIcon />}
                >
                    <b>{filter.label}:</b> {filter.value}
                </Button>
            ))}
        </div>
    );
}

const columnHelper = createColumnHelper<Thread>();
