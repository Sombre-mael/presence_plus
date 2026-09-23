import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import { PRIVACY_VERSION } from "@/lib/legal-policy";
import { getLegalConfiguration } from "@/lib/legal.server";

export const metadata: Metadata = { title: "Politique de confidentialité · Presence Plus" };
export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const config = await getLegalConfiguration();
  const academicYears = config.academicRetentionMonths / 12;
  return (
    <LegalPageShell title="Politique de confidentialité" version={PRIVACY_VERSION} description="Cette politique explique quelles données sont utilisées par Presence Plus, pourquoi elles le sont et comment exercer vos droits.">
      <LegalSection title="1. Qui est responsable de vos données ?">
        <p><strong className="text-foreground">{config.institutionName}</strong> est responsable du traitement des données académiques utilisées dans Presence Plus.</p>
        {config.institutionAddress ? <p>Adresse : {config.institutionAddress}</p> : null}
        {config.institutionLegalDetails ? <p>{config.institutionLegalDetails}</p> : null}
        <p>Contact confidentialité de l’établissement : <a className="font-medium text-primary underline underline-offset-4" href={`mailto:${config.privacyContactEmail}`}>{config.privacyContactEmail}</a>{config.privacyContactPhone ? ` · ${config.privacyContactPhone}` : ""}.</p>
        <p>L’équipe Presence Plus agit comme prestataire technique. Elle exploite la plateforme pour le compte de l’établissement et peut être contactée à <a className="font-medium text-primary underline underline-offset-4" href="mailto:presenceplus12@gmail.com">presenceplus12@gmail.com</a>.</p>
      </LegalSection>
      <LegalSection title="2. Données traitées et finalités">
        <LegalList>
          <li><strong className="text-foreground">Compte :</strong> nom, adresse e-mail, matricule étudiant, rôle, promotion, préférences de profil et état d’activation, pour identifier l’utilisateur et sécuriser son accès.</li>
          <li><strong className="text-foreground">Présences :</strong> cours, séances, heure de pointage, statut, source du pointage, corrections et justifications, pour établir et consulter l’assiduité.</li>
          <li><strong className="text-foreground">Sécurité :</strong> sessions actives, agent utilisateur, empreinte HMAC de l’adresse IP, tentatives limitées et journaux d’activité, pour prévenir les accès abusifs et assurer la traçabilité.</li>
          <li><strong className="text-foreground">Photo de profil :</strong> image soumise et décision humaine de validation, pour faciliter l’identification visuelle dans l’établissement.</li>
          <li><strong className="text-foreground">Communication :</strong> notifications internes, abonnements Web Push et état des e-mails transactionnels, pour signaler les événements utiles au suivi des présences.</li>
          <li><strong className="text-foreground">Demandes de droits :</strong> motif, suivi et réponse apportée, pour traiter les demandes d’accès, rectification, export, opposition ou suppression.</li>
        </LegalList>
        <p>Presence Plus ne collecte pas votre position GPS, n’effectue aucune reconnaissance faciale et ne transforme pas les photos en données biométriques. La validation d’une photo est réalisée visuellement par un administrateur habilité.</p>
      </LegalSection>
      <LegalSection title="3. Base et principes du traitement">
        <p>Les traitements répondent aux missions académiques et administratives de l’établissement, à l’exécution du service demandé et aux obligations de sécurité. Ils sont limités aux finalités annoncées et aux personnes habilitées.</p>
        <p>Presence Plus applique les principes de licéité, transparence, finalité déterminée, minimisation et durée limitée prévus notamment par les articles 192 et 193 du <a href="https://droitnumerique.cd/wp-content/uploads/2025/01/Code-du-numerique-I-RD-Congo.pdf" target="_blank" rel="noreferrer" className="font-medium text-primary underline underline-offset-4">Code du numérique de la RDC</a>.</p>
      </LegalSection>
      <LegalSection title="4. Destinataires et prestataires techniques">
        <p>Selon leurs fonctions, les données sont accessibles à l’utilisateur concerné, aux enseignants responsables, aux administrateurs habilités et aux responsables autorisés de l’établissement.</p>
        <LegalList>
          <li><strong className="text-foreground">Vercel :</strong> hébergement de l’application, fichiers privés, mesure d’audience agrégée et performance.</li>
          <li><strong className="text-foreground">Neon/PostgreSQL :</strong> hébergement de la base de données.</li>
          <li><strong className="text-foreground">Brevo ou Resend :</strong> acheminement des invitations et messages de sécurité.</li>
          <li><strong className="text-foreground">Services Web Push :</strong> remise des notifications facultatives par le navigateur et son fournisseur.</li>
        </LegalList>
        <p>Certains prestataires peuvent traiter des données hors de la RDC. L’établissement doit vérifier les lieux de traitement, les garanties contractuelles et les formalités applicables avant l’ouverture du service.</p>
      </LegalSection>
      <LegalSection title="5. Durées de conservation">
        <LegalList>
          <li>Présences, séances et corrections : {academicYears} ans à compter de la fin de la relation ou du cycle de conservation défini par l’établissement.</li>
          <li>Journaux d’audit : {config.auditRetentionMonths} mois.</li>
          <li>Notifications lues : 90 jours.</li>
          <li>Sessions expirées ou révoquées et abonnements push révoqués : 30 jours.</li>
          <li>Limitations anti-abus : 48 heures; jetons consommés ou expirés : 7 jours.</li>
          <li>Photos refusées ou annulées : fichier supprimé immédiatement; photo en attente abandonnée : 30 jours.</li>
        </LegalList>
        <p>Lorsque l’historique académique doit être conservé, une demande de suppression ne provoque pas son effacement immédiat. À l’expiration de la durée applicable, les identifiants directs sont anonymisés lorsque la conservation statistique reste nécessaire.</p>
      </LegalSection>
      <LegalSection title="6. Vos droits">
        <p>Vous pouvez demander l’accès à vos données, leur rectification, un export, vous opposer à certains traitements ou demander leur suppression. Une limitation peut s’appliquer lorsque la conservation d’une présence répond encore à une obligation académique ou à la défense d’un droit.</p>
        <p>Les utilisateurs connectés peuvent déposer et suivre une demande depuis le <Link href="/account/privacy" className="font-medium text-primary underline underline-offset-4">centre de confidentialité</Link>. Vous pouvez aussi écrire au contact confidentialité indiqué ci-dessus. L’établissement peut demander les éléments nécessaires pour vérifier votre identité.</p>
      </LegalSection>
      <LegalSection title="7. Sécurité et limites">
        <p>Presence Plus utilise notamment des mots de passe chiffrés par hachage, des cookies de session protégés, des autorisations par rôle, une limitation des tentatives, des traces d’audit et des fichiers de photo privés. Aucun système n’élimine toutefois totalement le risque; tout incident suspect doit être signalé rapidement à l’établissement.</p>
        <p>L’établissement doit vérifier, avec son conseil juridique, si ses traitements nécessitent une déclaration ou une autorisation auprès de l’ARPTC via le <a href="https://cadran.arptc.gouv.cd/" target="_blank" rel="noreferrer" className="font-medium text-primary underline underline-offset-4">guichet CADRAN</a>.</p>
      </LegalSection>
      <LegalSection title="8. Évolution de cette politique">
        <p>Une modification importante donne lieu à une nouvelle version. Les utilisateurs connectés sont invités à prendre connaissance de la nouvelle politique avant de poursuivre leur activité.</p>
      </LegalSection>
    </LegalPageShell>
  );
}
