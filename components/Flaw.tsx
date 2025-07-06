import React, { FC } from 'react'

const Flaw = ({sectionRefs ,report}) => {
  return (
       <section id="flaw" ref={sectionRefs.flaw} className="mb-24 scroll-mt-24">
                    <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">The Flaw: Improper Sanitization</h2>
                    <p className="text-center max-w-3xl mx-auto text-slate-600 mb-12">The vulnerability lies in how the plugin handles user-supplied language codes. A key function, `sanitize_text_field()`, is misused, failing to escape backticks (`) and allowing an attacker to break out of the SQL query.</p>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        {/* <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-slate-800">Vulnerable Code Analysis</h3>
                            <GeminiButton onClick={() => handleGeminiCall(`You are a cybersecurity expert. Explain the following PHP code snippet in the context of the CVE-2022-3141 SQL injection vulnerability. Explain what the code does, where the specific vulnerability is, and why it is a security risk. Format your response clearly. Code: \`\`\`php\n${reportData.flaw.vulnerableCode}\n\n${reportData.flaw.helperFunction}\n\`\`\``)}>
                                ✨ Explain This Code (AI)
                            </GeminiButton>
                        </div> */}
                        <div className="grid md:grid-cols-2 gap-8 items-start">
                            <div>
                                <p className="text-sm font-semibold mb-2 text-slate-600">Vulnerable Function:</p>
                                <CodeBlock code={reportData.flaw.vulnerableCode} />
                                <p className="text-sm font-semibold mt-4 mb-2 text-slate-600">Helper Function:</p>
                                <CodeBlock code={reportData.flaw.helperFunction} />
                            </div>
                            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg mt-6 md:mt-0">
                                <h4 className="font-bold text-amber-900">The Core Flaw</h4>
                                <p className="text-amber-800 mt-2" dangerouslySetInnerHTML={{ __html: reportData.flaw.explanation }}></p>
                            </div>
                        </div>
                    </div>
                </section>
  )
  
}

const CodeBlock: FC<{ code: string }> = ({ code }) => (
    <div className="code-block bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-sm overflow-x-auto whitespace-pre">
        {code}
    </div>
);

export default Flaw