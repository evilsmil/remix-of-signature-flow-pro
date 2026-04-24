import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/button";
import { getSession, resetPassword } from "@/lib/auth";
import { getErrorMessage } from "@/lib/api";

const searchSchema = z.object({
  token: z.string().catch(""),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — Usign" },
      {
        name: "description",
        content: "Choisissez un nouveau mot de passe Usign après vérification de votre code.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (getSession()) navigate({ to: "/" });
  }, [navigate]);

  const toggleLang = () => {
    const next = i18n.language === "fr" ? "en" : "fr";
    i18n.changeLanguage(next);
    localStorage.setItem("usign.lang", next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || password.length < 6 || isSubmitting) return;
    if (password !== confirmPassword) {
      toast.error(t("auth.passwordsMismatch"));
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token, password, confirmPassword);
      toast.success(t("auth.resetPasswordSuccess"));
      navigate({ to: "/login" });
    } catch (error) {
      toast.error(getErrorMessage(error, t("auth.resetPasswordError")));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <Logo />
        <div className="space-y-4">
          <h2 className="text-4xl font-semibold leading-tight">
            Créez un nouveau<br />mot de passe.
          </h2>
          <p className="max-w-md text-sidebar-foreground/70">
            Choisissez un mot de passe fort pour sécuriser à nouveau votre accès à Usign.
          </p>
        </div>
        <div className="text-xs text-sidebar-foreground/60">© Usign</div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex justify-end p-4">
          <Button variant="ghost" size="sm" onClick={toggleLang} className="gap-1.5">
            <Globe className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase">{i18n.language}</span>
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">{t("auth.resetPasswordTitle")}</h1>
              <p className="text-sm text-muted-foreground">
                {token ? t("auth.resetPasswordSubtitle") : t("auth.invalidResetLink")}
              </p>
            </div>

            {token ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("auth.newPassword")}
                  </label>
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={isSubmitting}
                    placeholder={t("auth.passwordPlaceholder")}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("auth.confirmPassword")}
                  </label>
                  <PasswordInput
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={isSubmitting}
                    placeholder={t("auth.confirmPasswordPlaceholder")}
                  />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full bg-action text-action-foreground hover:opacity-90">
                  {t("auth.resetPasswordSubmit")}
                </Button>
              </>
            ) : null}

            <p className="text-center text-sm text-muted-foreground">
              <Link to="/forgot-password" className="font-medium text-action hover:underline">
                {t("auth.requestAnotherReset")}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}