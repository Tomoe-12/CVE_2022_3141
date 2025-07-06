"use client";
import {
  useState,
  useEffect,
  useRef,
  FC,
} from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from "chart.js";
import Flaw from "@/components/Flaw";
import Exploit from "@/components/Exploit";
import Fix from "@/components/Fix";
import Reflections from "@/components/Reflections";
import Header from "@/components/Header";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// --- Data Store ---
const reportData: ReportData = {
  overview: {
    text: `CVE-2022-3141 describes a critical SQL injection vulnerability in the "TranslatePress" WordPress plugin (versions < 2.3.3). It allows an authenticated user, even with low privileges, to execute arbitrary SQL commands. The flaw stems from improper sanitization of the 'language code' input, allowing an attacker to inject malicious SQL syntax and control the database. This report visualizes the vulnerability's lifecycle: the flaw, the exploit, and the fix.`,
    cvss: {
      score: 8.8,
      vectorString: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H",
      vectorComponents: [
        {
          key: "AV:N",
          name: "Attack Vector",
          value: "Network",
          description: "The vulnerability is exploitable remotely.",
        },
        {
          key: "AC:L",
          name: "Attack Complexity",
          value: "Low",
          description: "No special conditions are required for exploitation.",
        },
        {
          key: "PR:L",
          name: "Privileges Required",
          value: "Low",
          description: "Requires a low-privileged user account.",
        },
        {
          key: "UI:N",
          name: "User Interaction",
          value: "None",
          description: "No action is needed from any other user.",
        },
        {
          key: "S:U",
          name: "Scope",
          value: "Unchanged",
          description:
            "The exploit does not affect components beyond the vulnerable one.",
        },
        {
          key: "C:H",
          name: "Confidentiality",
          value: "High",
          description: "Attacker can read all data from the database.",
        },
        {
          key: "I:H",
          name: "Integrity",
          value: "High",
          description: "Attacker can modify or delete all data.",
        },
        {
          key: "A:H",
          name: "Availability",
          value: "High",
          description: "Attacker can cause a denial of service.",
        },
      ],
    },
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
    explanation: `The core issue is that <strong>sanitize_text_field() does not escape backticks (\`)</strong>. An attacker can inject a backtick in the \`language_code\` parameter to close the table name prematurely and then append their own SQL commands.`,
  },
  exploitSteps: [
    {
      title: "Step 1: Environment Setup",
      content:
        "First, we create an isolated lab environment using Docker to host a WordPress instance with a MariaDB database. This prevents any unintended impact on a live system.",
      code: "docker-compose up -d",
    },
    {
      title: "Step 2: Install Vulnerable Plugin",
      content:
        "Next, we install a version of the TranslatePress plugin known to be vulnerable (any version before 2.3.3) onto our WordPress site.",
      code: "Access WP Admin > Plugins > Add New > Upload Plugin",
    },
    {
      title: "Step 3: Intercept Request",
      content:
        "Using a proxy tool like Burp Suite, we intercept the POST request sent when adding a new language. This allows us to see and modify the `trp_settings[translation-languages][]` parameter.",
      code: `POST /wp-admin/options.php HTTP/1.1\nHost: localhost\n...\n\n...&trp_settings[translation-languages][]=en_US&...`,
    },
    {
      title: "Step 4: Inject Payload",
      content:
        "We craft a time-based blind SQL injection payload and insert it into the vulnerable parameter. This payload will cause the database to pause if the injection is successful.",
      code: "Payload: ` OR SLEEP(5)#",
    },
    {
      title: "Step 5: Automate with sqlmap",
      content:
        "To efficiently extract data, we save the request to a file and use `sqlmap`. This tool automates the process of confirming the vulnerability and dumping database contents.",
      code: 'sqlmap -r request.txt -p "trp_settings[translation-languages][]" --dump',
    },
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
// This function is now called before using the language code.`,
  },
};


// --- Main App Component ---
const App: FC = () => {
  const [activeSection, setActiveSection] = useState("overview");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentExploitStep, setCurrentExploitStep] = useState(0);

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
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-50% 0px -50% 0px" }
    );

    Object.values(sectionRefs).forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => observer.disconnect();
  }, []);


  const cvssChartData: ChartData<"bar"> = {
    labels: ["CVSS 3.1 Base Score"],
    datasets: [
      {
        label: "Score",
        data: [reportData.overview.cvss.score],
        backgroundColor: ["#ef4444"],
        borderColor: ["#dc2626"],
        borderWidth: 1,
        barThickness: 50,
      },
    ],
  };

  const cvssChartOptions: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { beginAtZero: true, max: 10, grid: { color: "#e2e8f0" } },
      y: { grid: { display: false } },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (context) => `Score: ${context.parsed.x}` },
      },
    },
  };

  return (
    <div className="bg-slate-50 text-slate-800 font-sans">
      <Header
        activeSection={activeSection}
        isMenuOpen={isMenuOpen}
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <section className="text-center mb-24">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
            Interactive Analysis: CVE-2022-3141
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600">
            An in-depth look at the authenticated SQL Injection vulnerability in
            the TranslatePress WordPress plugin.
          </p>
        </section>

        <section
          id="overview"
          ref={sectionRefs.overview}
          className="mb-24 b scroll-mt-24"
        >
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
            Vulnerability Overview
          </h2>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="bg-white p-4 lg:p-8 rounded-lg shadow-md ">
              <p className="text-slate-600  leading-relaxed">
                {reportData.overview.text}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">
                CVSS 3.1 Score: 8.8 (High)
              </h3>
              <div className="relative h-64 w-full max-w-lg mx-auto">
                <Bar options={cvssChartOptions} data={cvssChartData} />
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {reportData.overview.cvss.vectorComponents.map((c) => (
                  <div
                    key={c.key}
                    className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-transform hover:scale-105"
                    title={`${c.name}: ${c.value}\n${c.description}`}
                  >
                    {c.key}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Flaw sectionRefs={sectionRefs} reportData={reportData} />

        <Exploit
          sectionRefs={sectionRefs}
          reportData={reportData}
          currentExploitStep={currentExploitStep}
        />

        <Fix sectionRefs={sectionRefs} reportData={reportData} />

        <Reflections sectionRefs={sectionRefs} />
      </main>

      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
          <p>
            Interactive report created based on the "Web Exploitation Evaluation
            Report" for CVE-2022-3141.
          </p>
          <p className="mt-2">
            References:{" "}
            <a
              href="https://nvd.nist.gov/vuln/detail/CVE-2022-3141"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              NVD
            </a>{" "}
            |{" "}
            <a
              href="https://owasp.org/Top10/A03_2021-Injection/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              OWASP Injection
            </a>
          </p>
        </div>
      </footer>

    
    </div>
  );
};

export default App;
