import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => String(searchParams.get("token") ?? ""), [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      toast.error("Missing reset token in URL.");
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      toast.error("Password must be at least 8 chars with uppercase, lowercase and number.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Password confirmation does not match.");
      return;
    }
    setLoading(true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      toast.success("Password updated successfully.");
      navigate("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center py-12">
        <div className="w-full max-w-md gradient-card rounded-2xl border border-border p-8 animate-slide-up">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-display font-bold mb-2">Reset Password</h1>
            <p className="text-sm text-muted-foreground">Create a new secure password for your account.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>New Password</Label>
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="********" required className="mt-1.5" />
              <p className="text-[11px] text-muted-foreground mt-1">8+ chars, uppercase, lowercase, and a number.</p>
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="********" required className="mt-1.5" />
            </div>
            <Button type="submit" className="w-full glow-yellow" disabled={loading || !token}>
              <LockKeyhole size={18} className="mr-2" />
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-6">
            Back to{" "}
            <Link to="/login" className="text-primary hover:underline">login</Link>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default ResetPassword;

