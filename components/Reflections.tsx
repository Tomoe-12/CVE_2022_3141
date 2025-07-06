import React from "react";

interface ReflectionsProps {
  sectionRefs: {
    reflections: React.RefObject<HTMLElement>;
  };
}

const Reflections: React.FC<ReflectionsProps> = ({ sectionRefs }) => {
  return (
    <section
      id="reflections"
      ref={sectionRefs.reflections}
      className="mb-12 scroll-mt-24"
    >
      <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
        Key Reflections & Takeaways
      </h2>
      <div className="grid md:grid-cols-3 gap-8 text-center">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-600 mx-auto mb-4">
            ⚙️
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            Technical Insights
          </h3>
          <p className="text-slate-600">
            Security controls are not one-size-fits-all. A function like
            `sanitize_text_field` is for preventing XSS, not SQLi. Context is
            everything.
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-600 mx-auto mb-4">
            🧗
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            Challenges
          </h3>
          <p className="text-slate-600">
            Replicating environments with specific vulnerable software versions
            can be challenging but is a critical skill for analysis and
            verification.
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-600 mx-auto mb-4">
            🌱
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            Personal Growth
          </h3>
          <p className="text-slate-600">
            This analysis bridges theory and practice, solidifying the
            importance of manual code review alongside automated tooling.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Reflections;
