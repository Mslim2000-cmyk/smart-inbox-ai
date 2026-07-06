

export function Privacy() {
  return (
    <div className="bg-white py-24" id="features">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="font-title text-base leading-7 text-blue-600">
            Privacy first
          </h2>
          <p className="mt-2 font-title text-3xl text-gray-900 sm:text-4xl">
            Open Source. See exactly what the code does. Or host it yourself.
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            This public demo uses fake seed emails, does not require Gmail
            OAuth, and does not write demo actions to the database. Nothing
            you do on <code>/demo</code> touches a real inbox.
          </p>
          <p className="mt-2 text-lg leading-8 text-gray-600">
            The base project (Inbox Zero) is SOC2 compliant and CASA Tier 2
            approved — those certifications belong to the upstream project.
            This portfolio demo inherits its open-source codebase and
            privacy-first design.
          </p>
        </div>
      </div>
    </div>
  );
}
