import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { login, register, type RegisterInput } from "@/lib/api";
import { DEMO_MODE } from "@/lib/api-client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Login or Register — SplitEase" },
      { name: "description", content: "Sign in to SplitEase to manage friends and shared expenses." },
      { property: "og:title", content: "Login or Register — SplitEase" },
      { property: "og:description", content: "Sign in to SplitEase to manage friends and shared expenses." },
    ],
  }),
  component: AuthPage,
});

const PASS_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,15}$/;

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("login");
  const [busy, setBusy] = useState(false);
  const [lu, setLu] = useState(DEMO_MODE ? "DEMO1" : "");
  const [lp, setLp] = useState(DEMO_MODE ? "Demo@123" : "");
  const [r, setR] = useState<RegisterInput>({ firstname: "", lastname: "", username: "", gender: "male", email: "", mobile_no: "", password: "" });

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(lu.trim(), lp);
      toast.success("Welcome back!");
      navigate({ to: "/friends" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (r.firstname.length < 3 || r.lastname.length < 3) { toast.error("First/last name kam se kam 3 characters"); return; }
    if (!/^[A-Z0-9]{5,}$/.test(r.username)) { toast.error("Username: 5+ characters, sirf CAPITAL letters aur numbers"); return; }
    if (!/^\d{10}$/.test(r.mobile_no)) { toast.error("Mobile number 10 digits ka hona chahiye"); return; }
    if (!PASS_RE.test(r.password)) { toast.error("Password 8-15 chars, upper, lower, number aur special (@$!%*?&) chahiye"); return; }
    setBusy(true);
    try {
      await register(r);
      toast.success("Account ban gaya! Ab login karein.");
      setLu(r.username);
      setLp("");
      setTab("login");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof RegisterInput) => (e: React.ChangeEvent<HTMLInputElement>) => setR({ ...r, [k]: e.target.value });

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2 text-xl font-bold"><Wallet className="h-6 w-6" /> SplitEase</div>
        <div>
          <h1 className="text-4xl font-extrabold leading-tight">Hisaab saaf,<br />dosti pakki.</h1>
          <p className="mt-4 max-w-sm opacity-80">Friends aur groups ke saath kharche baantein, balance dekhein aur ek click me settle karein.</p>
        </div>
        <p className="text-sm opacity-70">© SplitEase</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {DEMO_MODE && (
            <div className="mb-4 rounded-lg border border-border bg-secondary p-3 text-sm text-secondary-foreground">
              Demo mode: nakli data. Login: <b>DEMO1</b> / <b>Demo@123</b>
            </div>
          )}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={doLogin} className="mt-6 space-y-4">
                <h2 className="text-2xl font-bold">Login</h2>
                <div className="space-y-2"><Label>Username</Label><Input value={lu} onChange={(e) => setLu(e.target.value.toUpperCase())} required /></div>
                <div className="space-y-2"><Label>Password</Label><Input type="password" value={lp} onChange={(e) => setLp(e.target.value)} required /></div>
                <Button className="w-full" disabled={busy}>{busy ? "Please wait..." : "Login"}</Button>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={doRegister} className="mt-6 space-y-4">
                <h2 className="text-2xl font-bold">Create account</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>First name</Label><Input value={r.firstname} onChange={set("firstname")} required /></div>
                  <div className="space-y-2"><Label>Last name</Label><Input value={r.lastname} onChange={set("lastname")} required /></div>
                </div>
                <div className="space-y-2"><Label>Username</Label><Input value={r.username} onChange={(e) => setR({ ...r, username: e.target.value.toUpperCase() })} placeholder="RISHVA01" required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Gender</Label>
                    <Select value={r.gender} onValueChange={(v) => setR({ ...r, gender: v as RegisterInput["gender"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Mobile</Label><Input value={r.mobile_no} onChange={set("mobile_no")} maxLength={10} required /></div>
                </div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={r.email} onChange={set("email")} required /></div>
                <div className="space-y-2"><Label>Password</Label><Input type="password" value={r.password} onChange={set("password")} required /></div>
                <Button className="w-full" disabled={busy}>{busy ? "Please wait..." : "Register"}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
