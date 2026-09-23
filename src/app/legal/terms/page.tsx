import type { Metadata } from "next";
import { LegalList, LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import { TERMS_VERSION } from "@/lib/legal-policy";
import { getLegalConfiguration } from "@/lib/legal.server";

export const metadata: Metadata = { title: "Conditions d’utilisation · Presence Plus" };
export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const config = await getLegalConfiguration();
  return (
    <LegalPageShell title="Conditions d’utilisation" version={TERMS_VERSION} description="Ces conditions définissent les règles applicables à l’accès et à l’utilisation de Presence Plus au sein de l’établissement.">
      <LegalSection title="1. Objet du service">
        <p>Presence Plus est une plateforme de gestion des présences académiques mise à disposition par <strong className="text-foreground">{config.institutionName}</strong>. Elle permet de planifier des séances, enregistrer les présences, consulter l’assiduité, corriger une information et produire les suivis autorisés.</p>
      </LegalSection>
      <LegalSection title="2. Accès au compte">
        <p>L’accès est réservé aux personnes autorisées par l’établissement. Il n’existe pas d’inscription publique. Chaque utilisateur doit employer son propre compte, protéger son mot de passe et signaler sans délai toute utilisation suspecte.</p>
        <p>Les rôles administrateur, enseignant et étudiant donnent accès à des fonctions différentes. Il est interdit de chercher à contourner ces autorisations ou à accéder aux informations d’une autre personne sans motif légitime.</p>
      </LegalSection>
      <LegalSection title="3. Règles d’utilisation">
        <LegalList>
          <li>Fournir des informations exactes et tenir son profil à jour.</li>
          <li>Utiliser le QR code, le code manuel et les corrections uniquement pour une présence réelle.</li>
          <li>Ne pas partager un code de séance, un lien d’activation ou des identifiants avec une personne non autorisée.</li>
          <li>Ne pas perturber le service, automatiser des tentatives d’accès ou introduire un contenu malveillant.</li>
          <li>Respecter les règles académiques, le règlement intérieur et les droits des autres utilisateurs.</li>
        </LegalList>
      </LegalSection>
      <LegalSection title="4. Exactitude et corrections">
        <p>Les informations de présence peuvent avoir des conséquences académiques. L’utilisateur doit vérifier son historique et signaler une erreur via le parcours de correction. La décision finale relève des personnes habilitées par l’établissement et reste traçable.</p>
      </LegalSection>
      <LegalSection title="5. Disponibilité et sécurité">
        <p>L’équipe Presence Plus maintient des mesures raisonnables de sécurité et de continuité. Des interruptions peuvent néanmoins survenir lors d’une maintenance, d’un incident réseau ou d’une indisponibilité d’un prestataire. L’établissement conserve la responsabilité de ses procédures de continuité et de vérification académique.</p>
      </LegalSection>
      <LegalSection title="6. Suspension et fin d’accès">
        <p>L’établissement peut suspendre ou révoquer un compte en cas de départ, de changement de fonction, de risque de sécurité, de fraude présumée ou de violation de ces conditions. Les traces nécessaires et les données académiques restent conservées pendant les durées prévues par la politique de confidentialité.</p>
      </LegalSection>
      <LegalSection title="7. Propriété et réutilisation">
        <p>La plateforme, son code, sa marque et ses contenus restent protégés par la licence et les droits applicables. L’accès au service ne confère aucun droit de copie, redistribution, revente ou exploitation indépendante en dehors de l’accord conclu avec l’établissement.</p>
      </LegalSection>
      <LegalSection title="8. Contact et droit applicable">
        <p>Pour toute question d’usage, contactez votre administration. Pour une question technique, écrivez à <a href="mailto:presenceplus12@gmail.com" className="font-medium text-primary underline underline-offset-4">presenceplus12@gmail.com</a>. Ces conditions sont interprétées selon le droit de la République démocratique du Congo, sous réserve des règles impératives applicables.</p>
      </LegalSection>
    </LegalPageShell>
  );
}
