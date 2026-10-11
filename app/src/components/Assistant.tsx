import { useEffect, useRef, useState } from "react";
import { ArrowUp, MessageCircle, X } from "lucide-react";
import type { Dataset } from "../lib/data";
import { SUGGESTIONS, answer, type Action, type Answer } from "../lib/assistant";

type Msg = { from: "you" | "bot"; text: string; a?: Answer };

// **bold** only; everything else is plain text
const rich = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((s, i) => (s.startsWith("**") ? <b key={i}>{s.slice(2, -2)}</b> : s));

type Props = { data: Dataset; open: boolean; setOpen: (v: boolean) => void; onAction: (a: Action) => void };

export default function Assistant({ data, open, setOpen, onAction }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([{
    from: "bot",
    text: "Hi, I'm the SECOND LOOK assistant. Ask me about the portfolio, a policy, or a what-if. Answers are calculated from the data on this laptop.",
  }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs, typing]);
  useEffect(() => { if (open) field.current?.focus(); }, [open]);

  const ask = (q: string) => {
    if (!q.trim() || typing) return;
    setMsgs((m) => [...m, { from: "you", text: q }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const a = answer(data, q);
      setMsgs((m) => [...m, { from: "bot", text: a.text, a }]);
      setTyping(false);
    }, 380);
  };

  return (
    <>
      <button className={`fab ${open ? "hidden" : ""}`} onClick={() => setOpen(true)} aria-label="Ask SECOND LOOK">
        <MessageCircle size={22} aria-hidden /> <span>Ask SECOND LOOK</span>
      </button>

      {open && (
        <section className="chat" role="dialog" aria-label="SECOND LOOK assistant">
          <header>
            <div>
              <b>Ask SECOND LOOK</b>
              <small>Offline · answers computed from portfolio data</small>
            </div>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close assistant"><X size={20} /></button>
          </header>

          <div className="chat-body">
            {msgs.map((m, i) => (
              <div key={i} className={`bubble ${m.from}`}>
                <p>{rich(m.text)}</p>
                {m.a?.table && (
                  <table className="mini">
                    <tbody>
                      {m.a.table.map((r, j) => (
                        <tr key={j} className={j === 0 ? "head" : ""}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {m.a?.actions?.map((a) => (
                  <button key={a.label} className="btn ghost sm" onClick={() => onAction(a)}>{a.label} →</button>
                ))}
              </div>
            ))}
            {typing && <div className="bubble bot typing"><i /><i /><i /></div>}
            {msgs.length <= 2 || msgs[msgs.length - 1].a?.text.startsWith("I answer") ? (
              <div className="suggest">
                {SUGGESTIONS.map((s) => <button key={s} onClick={() => ask(s)}>{s}</button>)}
              </div>
            ) : null}
            <div ref={end} />
          </div>

          <form className="chat-input" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
            <input ref={field} value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. risk of a second CI policy paid monthly?" />
            <button className="send" disabled={!input.trim() || typing} aria-label="Send"><ArrowUp size={18} /></button>
          </form>
        </section>
      )}
    </>
  );
}
