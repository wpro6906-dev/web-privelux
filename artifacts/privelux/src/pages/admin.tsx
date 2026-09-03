import { useState } from "react";
import { useLocation } from "wouter";
import { useAdminLogin } from "@workspace/api-client-react";
import { useAdminAuth } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";

export function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { setToken } = useAdminAuth();
  
  const loginMutation = useAdminLogin({
    mutation: {
      onSuccess: (data) => {
        if (data.success && data.token) {
          setToken(data.token);
          toast.success("Access Granted");
          setLocation("/admin/dashboard");
        } else {
          toast.error("Invalid credentials");
        }
      },
      onError: () => {
        toast.error("Login failed");
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { username, password } });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="bg-card border-border rounded-none">
          <CardHeader className="text-center pb-8 border-b border-border/50">
            <div className="mx-auto w-12 h-12 bg-primary/10 flex items-center justify-center rounded-full mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="font-serif text-2xl uppercase tracking-widest">Admin Portal</CardTitle>
            <p className="text-sm text-muted-foreground mt-2 uppercase tracking-wider">Restricted Access</p>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Username</label>
                <Input 
                  required 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="rounded-none border-border bg-transparent h-12 focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Password</label>
                <Input 
                  required 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-none border-border bg-transparent h-12 focus-visible:ring-primary"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-14 rounded-none uppercase tracking-widest bg-foreground text-background hover:bg-foreground/90"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Authenticating..." : "Enter"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
