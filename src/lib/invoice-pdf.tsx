import { Document, Image, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { formatMoney, formatRate } from '@/lib/money';
import { invoiceTheme } from '@/lib/invoice-theme';
import type { InvoiceView } from '@/lib/invoice-view';

/**
 * The invoice as a file the client can keep.
 *
 * An email can be deleted, forwarded, or rendered into soup by whatever is
 * reading it; a PDF is the same page for everyone, and it is what an accounts
 * department asks for. It is drawn to match the sheet on screen rather than
 * from a separate design: the document the client files should be the one you
 * were looking at when you sent it.
 */
const MUTED = '#6b615a';
const LINE = '#e9e0d7';

const styles = StyleSheet.create({
  page: { padding: 44, fontSize: 10, color: '#17110e', fontFamily: 'Helvetica' },
  // Height only, so a wide logo and a square one both come out in proportion.
  logo: { height: 40, marginBottom: 10, objectFit: 'contain', alignSelf: 'flex-start' },
  business: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  quiet: { color: MUTED, marginTop: 2 },
  band: { marginTop: 22, padding: '10 12', fontSize: 18, fontFamily: 'Helvetica-Bold' },
  columns: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22 },
  label: { color: MUTED, fontSize: 9 },
  strong: { fontFamily: 'Helvetica-Bold' },
  row: { flexDirection: 'row', borderBottom: `1 solid ${LINE}`, paddingVertical: 7 },
  head: {
    flexDirection: 'row',
    borderBottom: `1 solid ${LINE}`,
    paddingBottom: 6,
    marginTop: 26,
  },
  headCell: { color: MUTED, fontSize: 8, letterSpacing: 1 },
  totals: { marginTop: 14, marginLeft: 'auto', width: 220 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  due: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: `1 solid ${LINE}`,
    marginTop: 4,
    paddingTop: 7,
  },
  block: { marginTop: 26, borderTop: `1 solid ${LINE}`, paddingTop: 14 },
});

const COLUMNS = { qty: 50, unit: 90, total: 90 };

export async function invoicePdf(invoice: InvoiceView): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument invoice={invoice} />);
}

function InvoiceDocument({ invoice }: { invoice: InvoiceView }) {
  const accent = invoiceTheme(invoice.themeColor, null).hex;

  return (
    <Document title={`Invoice ${invoice.number}`} author={invoice.business}>
      <Page size="A4" style={styles.page}>
        <View>
          {invoice.logo ? <Image src={invoice.logo.dataUri} style={styles.logo} /> : null}
          <Text style={styles.business}>{invoice.business}</Text>
          <Text style={styles.quiet}>{invoice.businessContact}</Text>
          {invoice.businessAddress ? (
            <Text style={styles.quiet}>{invoice.businessAddress}</Text>
          ) : null}
        </View>

        <Text style={[styles.band, { backgroundColor: `${accent}1f`, color: accent }]}>
          INVOICE
        </Text>

        <View style={styles.columns}>
          <View>
            <Text style={styles.label}>Bill to</Text>
            <Text style={[styles.strong, { marginTop: 4 }]}>{invoice.clientName}</Text>
            {invoice.clientCompany ? <Text>{invoice.clientCompany}</Text> : null}
            {invoice.clientEmail ? <Text style={styles.quiet}>{invoice.clientEmail}</Text> : null}
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Field label="Invoice #" value={invoice.number} />
            <Field label="Date issued" value={day(invoice.issuedAt) ?? 'Not sent yet'} />
            <Field label="Payment due" value={day(invoice.dueAt) ?? '—'} />
          </View>
        </View>

        <View style={styles.head}>
          <Text style={[styles.headCell, { flex: 1 }]}>SERVICE INFO</Text>
          <Text style={[styles.headCell, { width: COLUMNS.qty, textAlign: 'right' }]}>QTY</Text>
          <Text style={[styles.headCell, { width: COLUMNS.unit, textAlign: 'right' }]}>
            UNIT PRICE
          </Text>
          <Text style={[styles.headCell, { width: COLUMNS.total, textAlign: 'right' }]}>TOTAL</Text>
        </View>

        {invoice.items.map((item, index) => (
          <View key={index} style={styles.row} wrap={false}>
            <Text style={{ flex: 1, paddingRight: 10 }}>{item.description}</Text>
            <Text style={{ width: COLUMNS.qty, textAlign: 'right' }}>{item.quantity}</Text>
            <Text style={{ width: COLUMNS.unit, textAlign: 'right' }}>
              {formatMoney(item.unitPriceCents, invoice.currency)}
            </Text>
            <Text style={{ width: COLUMNS.total, textAlign: 'right' }}>
              {formatMoney(item.quantity * item.unitPriceCents, invoice.currency)}
            </Text>
          </View>
        ))}

        <View style={styles.totals}>
          <Total label="Subtotal" value={formatMoney(invoice.subtotalCents, invoice.currency)} />
          {invoice.taxRateBp ? (
            <Total
              label={`${invoice.taxLabel} ${formatRate(invoice.taxRateBp)}`}
              value={formatMoney(invoice.taxCents, invoice.currency)}
            />
          ) : null}
          <Total label="Paid" value={formatMoney(invoice.paidCents, invoice.currency)} />

          <View style={styles.due}>
            <Text style={styles.strong}>Balance due</Text>
            <Text style={[styles.strong, { color: accent }]}>
              {formatMoney(invoice.balanceCents, invoice.currency)}
            </Text>
          </View>
        </View>

        {invoice.pay.length > 0 || invoice.taxNumber ? (
          <View style={styles.block}>
            <Text style={styles.headCell}>HOW TO PAY</Text>
            {invoice.pay.map(([label, value]) => (
              <Text key={label} style={{ marginTop: 4 }}>
                <Text style={{ color: MUTED }}>{label}: </Text>
                {value}
              </Text>
            ))}
            {invoice.payNotes ? (
              <Text style={[styles.quiet, { marginTop: 8 }]}>{invoice.payNotes}</Text>
            ) : null}
            {invoice.taxNumber ? (
              <Text style={[styles.quiet, { marginTop: 8 }]}>
                {invoice.taxLabel} registration {invoice.taxNumber}
              </Text>
            ) : null}
          </View>
        ) : null}

        {invoice.notes ? (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.headCell}>NOTES</Text>
            <Text style={{ marginTop: 4 }}>{invoice.notes}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: 8, alignItems: 'flex-end' }}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.strong, { marginTop: 2 }]}>{value}</Text>
    </View>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.totalRow}>
      <Text style={{ color: MUTED }}>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

function day(value: Date | null): string | null {
  if (!value) return null;
  return value.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
