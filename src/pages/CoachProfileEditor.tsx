import { useEffect, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { api, resolveApiUrl } from "@/lib/api";
import { getToken } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/i18n/locale";
import { toast } from "sonner";
import { Camera, Save } from "lucide-react";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Profile = {
  headline: string | null;
  bio: string | null;
  expertise: string[];
  qualities: string[];
  certifications: string[];
  previousWorkplaces: string[];
  languages: string[];
  yearsExperience: number | null;
  hourlyRate: number | null;
  currency: string;
  profileImageUrl: string | null;
};

const listToString = (arr: string[]) => (arr ?? []).join(", ");
const stringToList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

const CoachProfileEditor = () => {
  const { t } = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    headline: "",
    bio: "",
    expertise: "",
    qualities: "",
    certifications: "",
    previousWorkplaces: "",
    languages: "",
    yearsExperience: "",
    hourlyRate: "",
    currency: "TND",
  });

  useEffect(() => {
    api<{ profile: Profile }>("/api/coach/profile", { authenticated: true })
      .then((data) => {
        const p: Profile = data.profile ?? ({} as Profile);
        setAvatarUrl(p.profileImageUrl ?? null);
        setForm({
          headline: p.headline ?? "",
          bio: p.bio ?? "",
          expertise: listToString(p.expertise ?? []),
          qualities: listToString(p.qualities ?? []),
          certifications: listToString(p.certifications ?? []),
          previousWorkplaces: listToString(p.previousWorkplaces ?? []),
          languages: listToString(p.languages ?? []),
          yearsExperience: p.yearsExperience != null ? String(p.yearsExperience) : "",
          hourlyRate: p.hourlyRate != null ? String(p.hourlyRate) : "",
          currency: p.currency ?? "TND",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api("/api/coach/profile", {
        method: "PATCH",
        authenticated: true,
        body: JSON.stringify({
          headline: form.headline || null,
          bio: form.bio || null,
          expertise: stringToList(form.expertise),
          qualities: stringToList(form.qualities),
          certifications: stringToList(form.certifications),
          previousWorkplaces: stringToList(form.previousWorkplaces),
          languages: stringToList(form.languages),
          yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : null,
          hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : null,
          currency: form.currency || "TND",
        }),
      });
      toast.success(t("coachEditor.saved"));
    } catch (err: any) {
      toast.error(err?.message ?? "Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, WebP or GIF image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image must be under 5 MB.");
      return;
    }

    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const token = getToken(); // ← correct key from session.ts
      const res = await fetch(resolveApiUrl("/api/coach/profile/avatar"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Upload failed");
      setAvatarUrl(data.imageUrl);
      toast.success(t("coachEditor.avatarUpdated"));
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setAvatarUploading(false);
      // Reset file input so same file can be re-selected after error
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </Layout>
    );
  }

  const field = (key: keyof typeof form, label: string, multiline?: boolean) => (
    <div>
      <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
      {multiline ? (
        <Textarea
          rows={4}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="rounded-xl text-sm"
        />
      ) : (
        <Input
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="rounded-xl text-sm"
        />
      )}
    </div>
  );

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">{t("coachEditor.title")}</h1>

        {/* Avatar */}
        <div className="flex items-center gap-5 mb-8">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">?</div>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-600 rounded-full flex items-center justify-center shadow-md hover:bg-green-700"
              disabled={avatarUploading}
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{t("coachEditor.uploadAvatar")}</p>
            <p className="text-xs text-gray-400 mt-0.5">JPG, PNG up to 5 MB</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-5">
          {field("headline", t("coachEditor.headline"))}
          {field("bio", t("coachEditor.bio"), true)}
          {field("expertise", t("coachEditor.expertise"))}
          {field("qualities", t("coachEditor.qualities"))}
          {field("certifications", t("coachEditor.certifications"))}
          {field("languages", t("coachEditor.languages"))}

          <div className="grid grid-cols-2 gap-4">
            {field("yearsExperience", t("coachEditor.yearsExp"))}
            {field("hourlyRate", t("coachEditor.hourlyRate"))}
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl h-11"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "…" : t("coachEditor.save")}
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default CoachProfileEditor;
