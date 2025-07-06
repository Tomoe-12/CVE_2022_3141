import { FC } from "react";

export const CodeBlock: FC<{ code: string }> = ({ code }) => (
    <div className="code-block bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-sm overflow-x-auto whitespace-pre">
        {code}
    </div>
);