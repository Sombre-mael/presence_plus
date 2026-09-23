import type { Metadata } from "next";
import { LegalList, LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import { PRIVACY_VERSION } from "@/lib/legal-policy";

export const metadata: Metadata = { title: "Cookies et mesure d’audience · Presence Plus" };

export default function CookiesPage() {
  return (
    <LegalPageShell title="Cookies, stockage local et mesure d’audience" version={PRIVACY_VERSION} description="Presence Plus utilise uniquement les mécanismes nécessaires au fonctionnement, à la sécurité et à une mesure d’audience agrégée.">
      <LegalSection title="1. Pourquoi aucun bandeau de consentement n’est affiché">
        <p>Presence Plus ne dépose aucun cookie publicitaire et n’effectue aucun profilage commercial. Les cookies déposés par l’application sont strictement nécessaires à la connexion, à la sécurité ou à une préférence demandée par l’utilisateur. Ils sont documentés ici sans créer un faux choix qui empêcherait le fonctionnement du service.</p>
      </LegalSection>
      <LegalSection title="2. Cookies nécessaires">
        <LegalList>
          <li><strong className="text-foreground">Session Auth.js :</strong> maintient votre connexion dans un cookie HTTP-only, SameSite=Lax et sécurisé en production. Durée maximale de 14 jours, avec expiration après 7 jours d’inactivité.</li>
          <li><strong className="text-foreground">Protection CSRF :</strong> empêche certaines requêtes frauduleuses lors de la connexion.</li>
          <li><strong className="text-foreground">URL de retour :</strong> permet de revenir vers l’écran demandé après authentification.</li>
          <li><strong className="text-foreground">Préférence de sidebar :</strong> mémorise pendant 12 mois l’état ouvert ou compact du menu sur cet appareil.</li>
        </LegalList>
      </LegalSection>
      <LegalSection title="3. Stockage local et PWA">
        <p>Le stockage local du navigateur conserve uniquement le rappel temporaire d’une proposition d’activation des notifications push. Le service worker de la PWA peut mettre en cache les ressources nécessaires à l’ouverture de l’application et vérifie les mises à jour. Aucune donnée académique métier n’est enregistrée durablement dans le stockage local.</p>
      </LegalSection>
      <LegalSection title="4. Notifications push">
        <p>Les notifications push sont facultatives. Elles ne sont activées qu’après une action de votre part et l’autorisation du navigateur. Vous pouvez les désactiver depuis votre espace Notifications ou les réglages du navigateur. Le fournisseur du navigateur intervient dans la remise technique du message.</p>
      </LegalSection>
      <LegalSection title="5. Vercel Analytics et Speed Insights">
        <p>Presence Plus utilise Vercel Analytics et Speed Insights pour comprendre la fréquentation des pages publiques et la qualité technique du service. Vercel Analytics fonctionne sans cookie, produit des statistiques agrégées et réinitialise quotidiennement l’identifiant dérivé utilisé pour distinguer les visites.</p>
        <p>Les espaces authentifiés, les routes API, les pages contenant des jetons et les URL dynamiques sensibles sont exclus avant envoi. Aucune adresse e-mail, aucun matricule, jeton ou identifiant de séance n’est volontairement transmis à ces outils.</p>
        <p>En savoir plus : <a href="https://vercel.com/docs/analytics" target="_blank" rel="noreferrer" className="font-medium text-primary underline underline-offset-4">documentation Vercel Analytics</a> et <a href="https://vercel.com/docs/analytics/privacy-policy" target="_blank" rel="noreferrer" className="font-medium text-primary underline underline-offset-4">politique de confidentialité Analytics</a>.</p>
      </LegalSection>
      <LegalSection title="6. Contrôles disponibles">
        <p>Vous pouvez supprimer les cookies et données de site depuis les réglages de votre navigateur. Cela vous déconnectera et réinitialisera les préférences locales. Le refus des notifications push n’empêche pas l’utilisation des fonctions de présence.</p>
      </LegalSection>
    </LegalPageShell>
  );
}
