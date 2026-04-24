import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { getSession, verifyResetCode } from "@/lib/auth";
import { getErrorMessage } from "@/lib/api";

const searchSchema = z.object({
  token: z.string().catch(""),
});

export const Route = createFileRoute("/reset-code")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Vérification du code — Usign" },
      {
        name: "description",
        content: "Vérifiez votre code à 6 chiffres avant de choisir un nouveau mot de passe Usign.",
      },
    ],
  }),
  component: ResetCodePage,
});

function ResetCodePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [code, setCode] = useState("");
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
    if (!token || code.length !== 6 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await verifyResetCode(token, code);
      toast.success(t("auth.resetCodeSuccess"));
      navigate({ to: "/reset-password", search: { token } });
    } catch (error) {
      toast.error(getErrorMessage(error, t("auth.resetCodeError")));
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
            Vérifiez votre code<br />de sécurité.
          </h2>
          <p className="max-w-md text-sidebar-foreground/70">
            Saisissez le code à 6 chiffres reçu par email pour accéder à l'étape suivante.
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
              <h1 className="text-2xl font-semibold text-foreground">{t("auth.resetCodeTitle")}</h1>
              <p className="text-sm text-muted-foreground">
                {token ? t("auth.resetCodeSubtitle") : t("auth.invalidResetLink")}
              </p>
            </div>

            {token ? (
              <>
                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("auth.resetCode")}
                  </label>
                  <InputOTP
                    value={code}
                    onChange={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    disabled={isSubmitting}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                  <p className="text-xs text-muted-foreground">{t("auth.resetCodeHelp")}</p>
                </div>

                <Button type="submit" disabled={isSubmitting || code.length !== 6} className="w-full bg-action text-action-foreground hover:opacity-90">
                  {t("auth.resetCodeSubmit")}
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