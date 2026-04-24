import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { forgotPassword, getSession } from "@/lib/auth";
import { getErrorMessage } from "@/lib/api";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Mot de passe oublié — Usign" },
      {
        name: "description",
        content: "Recevez un code de réinitialisation et définissez un nouveau mot de passe Usign.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (getSession()) navigate({ to: "/" });
  }, [navigate]);

  const toggleLang = () => {
    const next = i18n.language === "fr" ? "en" : "fr";
    i18n.changeLanguage(next);
    localStorage.setItem("usign.lang", next);
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setIsSuccess(true);
      toast.success(t("auth.forgotPasswordSuccess"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("auth.forgotPasswordError")));
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
            Récupérez l'accès<br />à votre espace Usign.
          </h2>
          <p className="max-w-md text-sidebar-foreground/70">
            Recevez un code de sécurité par email puis définissez un nouveau mot de passe.
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
          <form onSubmit={handleRequestSubmit} className="w-full max-w-sm space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">{t("auth.forgotPasswordTitle")}</h1>
              <p className="text-sm text-muted-foreground">
                {isSuccess ? t("auth.forgotPasswordSentSubtitle", { email }) : t("auth.forgotPasswordSubtitle")}
              </p>
            </div>

            {isSuccess ? (
              <div className="space-y-4 rounded-xl border border-border bg-card/60 p-5">
                <p className="text-sm text-muted-foreground">{t("auth.forgotPasswordSentHelp")}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsSuccess(false)}
                >
                  {t("auth.requestAnotherReset")}
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("auth.email")}
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    disabled={isSubmitting}
                    placeholder="vous@entreprise.com"
                  />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full bg-action text-action-foreground hover:opacity-90">
                  {t("auth.forgotPasswordSubmit")}
                </Button>
              </>
            )}

            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-medium text-action hover:underline">
                {t("auth.backToLogin")}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}