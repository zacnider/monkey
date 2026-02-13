import { promises as fs } from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./skill.css";

export const metadata = {
  title: "MonkeyVault - AI Trading Agents | Monad Hackathon",
  description: "Autonomous AI-powered trading agents with LLM decision-making on Monad blockchain",
};

async function getSkillContent() {
  const skillPath = path.join(process.cwd(), "SKILL.md");
  const content = await fs.readFile(skillPath, "utf8");
  return content;
}

export default async function SkillPage() {
  const content = await getSkillContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <div className="border-b border-purple-500/20 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            🐵 MonkeyVault
          </a>
          <div className="flex gap-4">
            <a
              href="/"
              className="px-4 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 transition-all"
            >
              Dashboard
            </a>
            <a
              href="/live"
              className="px-4 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 transition-all"
            >
              Live Feed
            </a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <article className="skill-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </article>

        {/* Footer CTA */}
        <div className="mt-12 p-8 bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/20 rounded-2xl backdrop-blur-sm">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              Ready to Experience AI-Powered Trading?
            </h3>
            <p className="text-gray-300 mb-6">
              Join MonkeyVault and let our 8 specialized AI agents trade for you on Monad
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href="/"
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
              >
                Start Trading
              </a>
              <a
                href="/live"
                className="px-6 py-3 bg-purple-500/10 text-purple-300 font-semibold rounded-lg border border-purple-500/20 hover:bg-purple-500/20 transition-all"
              >
                Watch Live
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
