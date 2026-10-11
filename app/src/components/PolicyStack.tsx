import { TYPE_LABEL, PAY_LABEL } from "../lib/format";

// CSS 3D stack: policies already held sit behind, the planned one floats in front, tinted by risk.
type Props = { held: number; firstType: string; firstPayment: string; type: string; payment: string; band: string };

export default function PolicyStack({ held, firstType, firstPayment, type, payment, band }: Props) {
  const back = Math.min(held, 3);
  return (
    <div className="stack3d" aria-hidden>
      <div className="stage">
        {Array.from({ length: back }, (_, i) => (
          <div key={i} className="pcard held" style={{ ["--i" as string]: back - i }}>
            <small>Policy {i + 1}</small>
            <b>{i === 0 ? TYPE_LABEL[firstType] : "Existing policy"}</b>
            {i === 0 && <span>{PAY_LABEL[firstPayment]}</span>}
          </div>
        ))}
        <div className={`pcard planned ${band}`} style={{ ["--i" as string]: 0 }}>
          <small>{held ? `Policy ${held + 1} · planned` : "First policy · planned"}</small>
          <b>{TYPE_LABEL[type]}</b>
          <span>{PAY_LABEL[payment]}</span>
        </div>
      </div>
    </div>
  );
}
