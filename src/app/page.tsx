import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-950 sm:px-10">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.svg" alt="Presence Plus" width={42} height={42} priority />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Presence Plus
            </p>
            <p className="text-sm text-slate-500">Suivi simple des presences</p>
          </div>
        </div>
        <a
          href="/login"
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Connexion
        </a>
      </nav>

      <section className="mx-auto grid w-full max-w-6xl gap-8 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
            MVP en preparation
          </div>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
              Une base claire pour gerer les presences par role.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              Presence Plus centralisera les sessions de cours, le pointage par QR code et
              les historiques pour les administrateurs, enseignants et etudiants.
            </p>
          </div>
          <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
            {["Admin", "Enseignant", "Etudiant"].map((role) => (
              <div
                key={role}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-sm text-slate-500">Espace</p>
                <p className="mt-1 font-semibold text-slate-900">{role}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Session demo</p>
              <h2 className="text-xl font-semibold text-slate-950">Algorithmique L2</h2>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
              Active
            </span>
          </div>

          <div className="space-y-3">
            {[
              ["QR genere", "Pret pour le pointage"],
              ["42 etudiants", "31 presences confirmees"],
              ["Export", "Rapport CSV a venir"],
            ].map(([title, text]) => (
              <div
                key={title}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-4"
              >
                <div>
                  <p className="font-medium text-slate-900">{title}</p>
                  <p className="text-sm text-slate-500">{text}</p>
                </div>
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
