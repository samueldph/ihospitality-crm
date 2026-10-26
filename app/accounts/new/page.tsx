import Link from 'next/link';
import { createAccount } from '@/server/actions/accounts';
export default function NewAccountPage() {
  return (<>
    <div className="rowsplit"><h1>New account</h1><Link className="muted" href="/accounts">← Back</Link></div>
    <form action={createAccount} style={{ maxWidth: 480, marginTop: 8 }}>
      <div className="field"><label htmlFor="name">Name *</label><input id="name" name="name" className="input" required /></div>
      <div className="field"><label htmlFor="kind">Type</label><select id="kind" name="kind" className="input"><option value="PARENT">Parent</option><option value="PROPERTY">Property</option></select></div>
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" className="input" type="email" /></div>
      <div className="field"><label htmlFor="phone">Phone</label><input id="phone" name="phone" className="input" /></div>
      <button className="btn" type="submit" style={{ marginTop: 8 }}>Create account</button>
    </form>
  </>);
}
