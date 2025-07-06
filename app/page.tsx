'use client'
import { useState, useEffect, useRef, FC, SetStateAction, Dispatch } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData
} from 'chart.js';
import Flaw from '@/components/Flaw';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// --- TypeScript Interfaces ---
interface CVSSComponent {
  key: string;
  name: string;
  value: string;
  description: string;
}

interface ExploitStep {
  title: string;
  content: string;
  code: string;
}

interface ReportData {
  overview: {
    text: string;
    cvss: {
      score: number;
      vectorString: string;
      vectorComponents: CVSSComponent[];
    };
  };
  flaw: {
    vulnerableCode: string;
    helperFunction: string;
    explanation: string;
  };
  exploitSteps: ExploitStep[];
  fix: {
    vulnerableCode: string;
    patchedCode: string;
  };
}

// --- Data Store ---
const reportData: ReportData = {
    overview: {
        text: `CVE-2022-3141 describes a critical SQL injection vulnerability in the "TranslatePress" WordPress plugin (versions < 2.3.3). It allows an authenticated user, even with low privileges, to execute arbitrary SQL commands. The flaw stems from improper sanitization of the 'language code' input, allowing an attacker to inject malicious SQL syntax and control the database. This report visualizes the vulnerability's lifecycle: the flaw, the exploit, and the fix.`,
        cvss: {
            score: 8.8,
            vectorString: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H",
            vectorComponents: [
                { key: 'AV:N', name: 'Attack Vector', value: 'Network', description: 'The vulnerability is exploitable remotely.' },
                { key: 'AC:L', name: 'Attack Complexity', value: 'Low', description: 'No special conditions are required for exploitation.' },
                { key: 'PR:L', name: 'Privileges Required', value: 'Low', description: 'Requires a low-privileged user account.' },
                { key: 'UI:N', name: 'User Interaction', value: 'None', description: 'No action is needed from any other user.' },
                { key: 'S:U', name: 'Scope', value: 'Unchanged', description: 'The exploit does not affect components beyond the vulnerable one.' },
                { key: 'C:H', name: 'Confidentiality', value: 'High', description: 'Attacker can read all data from the database.' },
                { key: 'I:H', name: 'Integrity', value: 'High', description: 'Attacker can modify or delete all data.' },
                { key: 'A:H', name: 'Availability', value: 'High', description: 'Attacker can cause a denial of service.' },
            ]
        }
    },
    flaw: {
        vulnerableCode: `public function get_all_translation_blocks( $language_code ){
    // The query concatenates user input into the table name
    $query = "SELECT original, id, block_type, status FROM \`" . 
        sanitize_text_field( $this->get_table_name( $language_code ) ) . 
        "\` WHERE block_type = " . self::BLOCK_TYPE_ACTIVE;
    
    $dictionary = $this->db->get_results($query, OBJECT_K);
    return $dictionary;
}`,
        helperFunction: `public function get_table_name($language_code, ...){
    // This function simply concatenates strings
    return $this->db->prefix . 'trp_dictionary_' . 
        strtolower( $default_language ) . '_' . 
        strtolower( $language_code );
}`,
        explanation: `The core issue is that <strong>sanitize_text_field() does not escape backticks (\`)</strong>. An attacker can inject a backtick in the \`language_code\` parameter to close the table name prematurely and then append their own SQL commands.`
    },
    exploitSteps: [
        { title: 'Step 1: Environment Setup', content: 'First, we create an isolated lab environment using Docker to host a WordPress instance with a MariaDB database. This prevents any unintended impact on a live system.', code: 'docker-compose up -d' },
        { title: 'Step 2: Install Vulnerable Plugin', content: 'Next, we install a version of the TranslatePress plugin known to be vulnerable (any version before 2.3.3) onto our WordPress site.', code: 'Access WP Admin > Plugins > Add New > Upload Plugin' },
        { title: 'Step 3: Intercept Request', content: 'Using a proxy tool like Burp Suite, we intercept the POST request sent when adding a new language. This allows us to see and modify the `trp_settings[translation-languages][]` parameter.', code: `POST /wp-admin/options.php HTTP/1.1\nHost: localhost\n...\n\n...&trp_settings[translation-languages][]=en_US&...` },
        { title: 'Step 4: Inject Payload', content: 'We craft a time-based blind SQL injection payload and insert it into the vulnerable parameter. This payload will cause the database to pause if the injection is successful.', code: 'Payload: ` OR SLEEP(5)#' },
        { title: 'Step 5: Automate with sqlmap', content: 'To efficiently extract data, we save the request to a file and use `sqlmap`. This tool automates the process of confirming the vulnerability and dumping database contents.', code: 'sqlmap -r request.txt -p "trp_settings[translation-languages][]" --dump' }
    ],
    fix: {
        vulnerableCode: `public function get_table_name($language_code, ...){
    // No validation is performed on $language_code
    return $this->db->prefix . 'trp_dictionary_' . 
        strtolower( $default_language ) . '_' . 
        strtolower( $language_code );
}`,
        patchedCode: `function trp_is_valid_language_code( $language_code ){
    // Whitelists allowed characters: a-z A-Z 0-9 - _
    if ( !empty($language_code) && 
         !preg_match( '/[^A-Za-z0-9\\-_]/', $language_code ) ){
        return true;
    } else {
        return false;
    }
}
// This function is now called before using the language code.`
    }
};

// --- Reusable Components ---

interface HeaderProps {
    activeSection: string;
    isMenuOpen: boolean;
    onMenuToggle: () => void;
}

const Header: FC<HeaderProps> = ({ activeSection, isMenuOpen, onMenuToggle }) => {
    const navLinks = [
        { href: '#overview', label: 'Overview' },
        { href: '#flaw', label: 'The Flaw' },
        { href: '#exploit', label: 'The Exploit' },
        { href: '#fix', label: 'The Fix' },
        { href: '#reflections', label: 'Reflections' },
    ];

    return (
        <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-50 border-b border-slate-200">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <span className="font-bold text-lg text-slate-900">CVE-2022-3141</span>
                    </div>
                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-4">
                            {navLinks.map(link => (
                                <a key={link.href} href={link.href} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeSection === link.href.substring(1) ? 'text-blue-500 font-semibold' : 'text-slate-600 hover:text-blue-500'}`}>{link.label}</a>
                            ))}
                        </div>
                    </div>
                    <div className="-mr-2 flex md:hidden">
                        <button type="button" onClick={onMenuToggle} className="bg-white inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" aria-controls="mobile-menu" aria-expanded={isMenuOpen}>
                            <span className="sr-only">Open main menu</span>
                            {isMenuOpen ? (
                                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            ) : (
                                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                            )}
                        </button>
                    </div>
                </div>
            </nav>
            {isMenuOpen && (
                <div className="md:hidden" id="mobile-menu">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                         {navLinks.map(link => (
                            <a key={link.href} href={link.href} className={`block px-3 py-2 rounded-md text-base font-medium ${activeSection === link.href.substring(1) ? 'text-blue-500 bg-blue-50' : 'text-slate-600 hover:text-blue-500 hover:bg-slate-50'}`}>{link.label}</a>
                        ))}
                    </div>
                </div>
            )}
        </header>
    );
};

interface GeminiModalProps {
    isOpen: boolean;
    content: string;
    onClose: () => void;
}

const GeminiModal: FC<GeminiModalProps> = ({ isOpen, content, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold text-slate-800">✨ AI-Powered Insight</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto" dangerouslySetInnerHTML={{ __html: content }}></div>
            </div>
        </div>
    );
};

interface GeminiButtonProps {
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
}

const GeminiButton: FC<GeminiButtonProps> = ({ onClick, children, className = '' }) => (
    <button onClick={onClick} className={`gemini-button bg-indigo-100 text-indigo-700 border border-indigo-200 hover:bg-indigo-200 text-sm font-semibold py-2 px-3 rounded-lg transition-colors ${className}`}>
        {children}
    </button>
);

// --- Main App Component ---
const App: FC = () => {
    const [activeSection, setActiveSection] = useState('overview');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [currentExploitStep, setCurrentExploitStep] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState('');

    const sectionRefs = {
        overview: useRef<HTMLElement>(null),
        flaw: useRef<HTMLElement>(null),
        exploit: useRef<HTMLElement>(null),
        fix: useRef<HTMLElement>(null),
        reflections: useRef<HTMLElement>(null),
    };

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { rootMargin: '-50% 0px -50% 0px' }
        );

        Object.values(sectionRefs).forEach(ref => {
            if (ref.current) {
                observer.observe(ref.current);
            }
        });

        return () => observer.disconnect();
    }, []);

    const handleGeminiCall = async (prompt: string) => {
        setModalContent(`<div class="flex items-center justify-center p-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div><p class="ml-4 text-slate-600">Generating AI insight...</p></div>`);
        setIsModalOpen(true);

        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const result = await response.json();
            if (result.candidates && result.candidates[0]?.content.parts[0]) {
                const text = result.candidates[0].content.parts[0].text;
                setModalContent(`<div class="prose max-w-none">${text.replace(/\n/g, '<br>')}</div>`);
            } else {
                throw new Error("No content received from API.");
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setModalContent(`<p class="text-red-500">Sorry, an error occurred: ${errorMessage}</p>`);
        }
    };

    const cvssChartData: ChartData<'bar'> = {
        labels: ['CVSS 3.1 Base Score'],
        datasets: [{
            label: 'Score',
            data: [reportData.overview.cvss.score],
            backgroundColor: ['#ef4444'],
            borderColor: ['#dc2626'],
            borderWidth: 1,
            barThickness: 50,
        }]
    };

    const cvssChartOptions: ChartOptions<'bar'> = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { beginAtZero: true, max: 10, grid: { color: '#e2e8f0' } },
            y: { grid: { display: false } }
        },
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (context) => `Score: ${context.parsed.x}` } }
        }
    };
    
    return (
        <div className="bg-slate-50 text-slate-800 font-sans">
            <Header activeSection={activeSection} isMenuOpen={isMenuOpen} onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <section className="text-center mb-24">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">Interactive Analysis: CVE-2022-3141</h1>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600">An in-depth look at the authenticated SQL Injection vulnerability in the TranslatePress WordPress plugin, enhanced with ✨ Gemini AI.</p>
                </section>

                <section id="overview" ref={sectionRefs.overview} className="mb-24 scroll-mt-24">
                    <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Vulnerability Overview</h2>
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                        <div className="bg-white p-8 rounded-lg shadow-md">
                            <p className="text-slate-600 leading-relaxed">{reportData.overview.text}</p>
                            <GeminiButton onClick={() => handleGeminiCall(`You are a security analyst explaining a vulnerability to a non-technical manager. Summarize the following vulnerability description in simple terms, focusing on the business impact (e.g., data breach, reputation damage, operational disruption). Keep it concise and clear. Vulnerability: ${reportData.overview.text}`)} className="mt-4">
                                ✨ Explain Impact (AI)
                            </GeminiButton>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">CVSS 3.1 Score: 8.8 (High)</h3>
                            <div className="relative h-64 w-full max-w-lg mx-auto">
                                <Bar options={cvssChartOptions} data={cvssChartData} />
                            </div>
                            <div className="mt-6 flex flex-wrap justify-center gap-2">
                                {reportData.overview.cvss.vectorComponents.map(c => (
                                    <div key={c.key} className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-transform hover:scale-105" title={`${c.name}: ${c.value}\n${c.description}`}>{c.key}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

<Flaw/>
                <section id="flaw" ref={sectionRefs.flaw} className="mb-24 scroll-mt-24">
                    <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">The Flaw: Improper Sanitization</h2>
                    <p className="text-center max-w-3xl mx-auto text-slate-600 mb-12">The vulnerability lies in how the plugin handles user-supplied language codes. A key function, `sanitize_text_field()`, is misused, failing to escape backticks (`) and allowing an attacker to break out of the SQL query.</p>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-slate-800">Vulnerable Code Analysis</h3>
                            <GeminiButton onClick={() => handleGeminiCall(`You are a cybersecurity expert. Explain the following PHP code snippet in the context of the CVE-2022-3141 SQL injection vulnerability. Explain what the code does, where the specific vulnerability is, and why it is a security risk. Format your response clearly. Code: \`\`\`php\n${reportData.flaw.vulnerableCode}\n\n${reportData.flaw.helperFunction}\n\`\`\``)}>
                                ✨ Explain This Code (AI)
                            </GeminiButton>
                        </div>
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

                <section id="exploit" ref={sectionRefs.exploit} className="mb-24 scroll-mt-24">
                    <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">The Exploit: A Step-by-Step Guide</h2>
                    <p className="text-center max-w-3xl mx-auto text-slate-600 mb-12">Exploiting this flaw involves setting up a lab, intercepting traffic to inject a malicious payload, and using automated tools to extract data from the database.</p>
                    <div className="relative">
                        <div className="bg-white p-8 rounded-lg shadow-md min-h-[300px]">
                            <h3 className="text-2xl font-semibold text-slate-800 mb-4">{reportData.exploitSteps[currentExploitStep].title}</h3>
                            <p className="text-slate-600 leading-relaxed mb-6">{reportData.exploitSteps[currentExploitStep].content}</p>
                            <CodeBlock code={reportData.exploitSteps[currentExploitStep].code} />
                        </div>
                        <div className="flex justify-center items-center mt-6 space-x-4">
                            <button onClick={() => setCurrentExploitStep(s => Math.max(0, s - 1))} disabled={currentExploitStep === 0} className="bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                            <div className="text-sm font-medium text-slate-500">Step {currentExploitStep + 1} of {reportData.exploitSteps.length}</div>
                            <button onClick={() => setCurrentExploitStep(s => Math.min(reportData.exploitSteps.length - 1, s + 1))} disabled={currentExploitStep === reportData.exploitSteps.length - 1} className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                        </div>
                    </div>
                </section>

                <section id="fix" ref={sectionRefs.fix} className="mb-24 scroll-mt-24">
                    <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">The Fix: Whitelisting Input</h2>
                    <p className="text-center max-w-3xl mx-auto text-slate-600 mb-12">The vulnerability was patched in version 2.3.3 by introducing a new validation function that whitelists allowed characters for language codes, effectively blocking malicious input.</p>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">Vulnerable Code</h3>
                            <CodeBlock code={reportData.fix.vulnerableCode} />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">Patched Code</h3>
                            <CodeBlock code={reportData.fix.patchedCode} />
                        </div>
                    </div>
                    <div className="mt-8 bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                        <div className="flex justify-between items-start">
                            <p className="text-green-800 pr-4"><strong className="font-semibold">Analysis:</strong> The patch is effective because it uses a regular expression to create a strict whitelist of allowed characters (letters, numbers, hyphen, underscore). Any input containing characters outside this list, such as a backtick, is rejected.</p>
                            <GeminiButton onClick={() => handleGeminiCall(`You are a senior secure coding instructor. Based on the following vulnerability where user input was improperly sanitized, leading to SQL injection, provide a list of 3-5 general best practices for preventing similar vulnerabilities in PHP web applications. Vulnerable Code: \`\`\`php\n${reportData.fix.vulnerableCode}\n\`\`\` Patched Code: \`\`\`php\n${reportData.fix.patchedCode}\n\`\`\``)} className="flex-shrink-0">
                                ✨ Generate Recommendations (AI)
                            </GeminiButton>
                        </div>
                    </div>
                </section>

                <section id="reflections" ref={sectionRefs.reflections} className="mb-12 scroll-mt-24">
                    <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Key Reflections & Takeaways</h2>
                    <div className="grid md:grid-cols-3 gap-8 text-center">
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-600 mx-auto mb-4">⚙️</div>
                            <h3 className="text-xl font-semibold text-slate-800 mb-2">Technical Insights</h3>
                            <p className="text-slate-600">Security controls are not one-size-fits-all. A function like `sanitize_text_field` is for preventing XSS, not SQLi. Context is everything.</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-600 mx-auto mb-4">🧗</div>
                            <h3 className="text-xl font-semibold text-slate-800 mb-2">Challenges</h3>
                            <p className="text-slate-600">Replicating environments with specific vulnerable software versions can be challenging but is a critical skill for analysis and verification.</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-600 mx-auto mb-4">🌱</div>
                            <h3 className="text-xl font-semibold text-slate-800 mb-2">Personal Growth</h3>
                            <p className="text-slate-600">This analysis bridges theory and practice, solidifying the importance of manual code review alongside automated tooling.</p>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="bg-white border-t border-slate-200">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
                    <p>Interactive report created based on the "Web Exploitation Evaluation Report" for CVE-2022-3141.</p>
                    <p className="mt-2">References: <a href="https://nvd.nist.gov/vuln/detail/CVE-2022-3141" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">NVD</a> | <a href="https://owasp.org/Top10/A03_2021-Injection/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">OWASP Injection</a></p>
                </div>
            </footer>
            
            <GeminiModal isOpen={isModalOpen} content={modalContent} onClose={() => setIsModalOpen(false)} />
        </div>
    );
}

export default App;
