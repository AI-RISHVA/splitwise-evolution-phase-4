import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Search, UserMinus, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CAN_LIST_INCOMING, forgetSent, getSent, listFriends, listIncoming, removeFriend,
  respondFriendRequest, searchUsers, sendFriendRequest, type FriendAction,
} from "@/lib/api";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({
    meta: [
      { title: "Friends — SplitEase" },
      { name: "description", content: "Search people, send friend requests and manage your friends list." },
      { property: "og:title", content: "Friends — SplitEase" },
      { property: "og:description", content: "Search people, send friend requests and manage your friends list." },
    ],
  }),
  component: FriendsPage,
});

const initials = (u: string) => u.slice(0, 2);

function Avatar({ name }: { name: string }) {
  return <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">{initials(name)}</div>;
}

function FriendsPage() {
  const qc = useQueryClient();
  const friends = useQuery({ queryKey: ["friends"], queryFn: listFriends });
  const incoming = useQuery({ queryKey: ["incoming"], queryFn: listIncoming });
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ firstname: string; lastname: string; username: string }[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [sent, setSent] = useState<string[]>(() => (typeof window === "undefined" ? [] : getSent()));
  const [manual, setManual] = useState("");
  const [toRemove, setToRemove] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["friends"] });
    qc.invalidateQueries({ queryKey: ["incoming"] });
  };

  const doSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setSearching(true);
    try { setResults(await searchUsers(q.trim())); }
    catch (err) { toast.error((err as Error).message); }
    finally { setSearching(false); }
  };

  const send = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: (_, u) => { toast.success(`Request bhej di: ${u}`); setSent(getSent()); },
    onError: (e) => toast.error(e.message),
  });

  const respond = useMutation({
    mutationFn: ({ u, a }: { u: string; a: FriendAction }) => respondFriendRequest(u, a),
    onSuccess: (_, { u, a }) => { toast.success(a === "accepted" ? `${u} ab aapke friend hain` : `${u} ki request reject ki`); setManual(""); refresh(); },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: removeFriend,
    onSuccess: (_, u) => { toast.success(`${u} ko remove kiya`); refresh(); },
    onError: (e) => toast.error(e.message),
    onSettled: () => setToRemove(null),
  });

  const friendNames = new Set(friends.data?.map((f) => f.username));
  const pendingCount = incoming.data?.length ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Friends</h1>
        <p className="mt-1 text-muted-foreground">Logon ko dhoondhein, request bhejein aur apni friends list sambhalein.</p>
      </div>

      <Card className="p-5">
        <form onSubmit={doSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Username se dhoondhein (e.g. PRIYA)" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button disabled={searching}>{searching ? "Searching..." : "Search"}</Button>
        </form>
        {results && (
          <div className="mt-4 divide-y divide-border">
            {results.length === 0 && <p className="py-4 text-sm text-muted-foreground">Koi user nahi mila.</p>}
            {results.map((u) => {
              const isFriend = friendNames.has(u.username);
              const isSent = sent.includes(u.username);
              return (
                <div key={u.username} className="flex items-center gap-3 py-3">
                  <Avatar name={u.username} />
                  <div className="flex-1">
                    <p className="font-semibold">{u.firstname} {u.lastname}</p>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                  {isFriend ? (
                    <span className="text-sm font-medium text-primary">Friend</span>
                  ) : (
                    <Button size="sm" variant={isSent ? "secondary" : "default"} disabled={send.isPending} onClick={() => send.mutate(u.username)}>
                      <UserPlus className="mr-1 h-4 w-4" /> {isSent ? "Request sent" : "Add Friend"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Tabs defaultValue="friends">
        <TabsList>
          <TabsTrigger value="friends">Friends {friends.data ? `(${friends.data.length})` : ""}</TabsTrigger>
          <TabsTrigger value="requests">Requests {pendingCount ? `(${pendingCount})` : ""}</TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="mt-4">
          <Card className="divide-y divide-border">
            {friends.isLoading && [0, 1, 2].map((i) => <div key={i} className="flex items-center gap-3 p-4"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-40" /></div>)}
            {friends.error && <p className="p-6 text-sm text-destructive">{friends.error.message}</p>}
            {friends.data?.length === 0 && <p className="p-8 text-center text-muted-foreground">Abhi koi friend nahi. Upar search karke add karein.</p>}
            {friends.data?.map((f) => (
              <div key={f.username} className="flex items-center gap-3 p-4">
                <Avatar name={f.username} />
                <p className="flex-1 font-semibold">@{f.username}</p>
                <BalanceLabel value={f.balance} />
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setToRemove(f.username)}>
                  <UserMinus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="mt-4 space-y-4">
          <Card className="divide-y divide-border">
            <p className="p-4 text-sm font-semibold">Aayi hui requests</p>
            {CAN_LIST_INCOMING ? (
              <>
                {incoming.data?.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Koi pending request nahi.</p>}
                {incoming.data?.map((u) => (
                  <div key={u} className="flex items-center gap-3 p-4">
                    <Avatar name={u} />
                    <p className="flex-1 font-semibold">@{u}</p>
                    <Button size="sm" disabled={respond.isPending} onClick={() => respond.mutate({ u, a: "accepted" })}><Check className="mr-1 h-4 w-4" /> Accept</Button>
                    <Button size="sm" variant="outline" disabled={respond.isPending} onClick={() => respond.mutate({ u, a: "rejected" })}><X className="mr-1 h-4 w-4" /> Reject</Button>
                  </div>
                ))}
              </>
            ) : (
              <div className="space-y-3 p-4">
                <p className="text-sm text-muted-foreground">Jis user ne aapko request bheji hai uska username daal kar accept ya reject karein.</p>
                <div className="flex gap-2">
                  <Input placeholder="USERNAME" value={manual} onChange={(e) => setManual(e.target.value.toUpperCase())} />
                  <Button disabled={!manual || respond.isPending} onClick={() => respond.mutate({ u: manual, a: "accepted" })}>Accept</Button>
                  <Button variant="outline" disabled={!manual || respond.isPending} onClick={() => respond.mutate({ u: manual, a: "rejected" })}>Reject</Button>
                </div>
              </div>
            )}
          </Card>

          <Card className="divide-y divide-border">
            <p className="p-4 text-sm font-semibold">Aapki bheji hui requests</p>
            {sent.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Abhi koi request nahi bheji.</p>}
            {sent.map((u) => (
              <div key={u} className="flex items-center gap-3 p-4">
                <Avatar name={u} />
                <p className="flex-1 font-semibold">@{u}</p>
                <span className="text-xs text-muted-foreground">{friendNames.has(u) ? "Accepted" : "Pending"}</span>
                <Button size="sm" variant="ghost" onClick={() => { forgetSent(u); setSent(getSent()); }}><X className="h-4 w-4" /></Button>
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!toRemove} onOpenChange={(o) => !o && setToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>@{toRemove} ko remove karein?</AlertDialogTitle>
            <AlertDialogDescription>Balance settle hone par hi friend remove ho sakta hai.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); if (toRemove) remove.mutate(toRemove); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BalanceLabel({ value }: { value: number }) {
  if (Math.abs(value) < 0.01) return <span className="text-sm text-muted-foreground">Settled</span>;
  const owesYou = value > 0;
  return (
    <div className="text-right">
      <p className="text-xs text-muted-foreground">{owesYou ? "owes you" : "you owe"}</p>
      <p className={`font-bold ${owesYou ? "text-primary" : "text-destructive"}`}>₹{Math.abs(value).toFixed(2)}</p>
    </div>
  );
}
