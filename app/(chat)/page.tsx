import { cookies } from "next/headers";
import { Suspense } from "react";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <NewChatPage searchParams={searchParams} />
    </Suspense>
  );
}

async function NewChatPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const [cookieStore, resolvedParams] = await Promise.all([
    cookies(),
    searchParams,
  ]);
  const modelIdFromCookie = cookieStore.get("chat-model");
  const id = generateUUID();
  const projectId = resolvedParams.projectId;

  return (
    <>
      <Chat
        autoResume={false}
        id={id}
        initialChatModel={modelIdFromCookie?.value ?? DEFAULT_CHAT_MODEL}
        initialMessages={[]}
        initialVisibilityType="private"
        isReadonly={false}
        key={id}
        projectId={projectId}
      />
      <DataStreamHandler />
    </>
  );
}
