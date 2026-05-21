import nodemailer from "nodemailer";

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendExamSubmissionEmail({
  studentName,
  examName,
  submittedAt,
}: {
  studentName: string;
  examName: string;
  submittedAt: Date;
}) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log(`[email disabled] ${studentName} submitted ${examName} at ${submittedAt.toISOString()}`);
    return;
  }
  const dateStr = submittedAt.toLocaleString("he-IL", {
    timeZone: "Asia/Jerusalem",
    dateStyle: "full",
    timeStyle: "short",
  });

  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO,
    subject: `✓ ${studentName} סיים מבחן: ${examName}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">הגשת מבחן – אולפן ערבית</h2>
        <hr style="border: 1px solid #eee;" />
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; font-weight: bold; width: 120px;">חניך:</td>
            <td style="padding: 8px;">${studentName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">מבחן:</td>
            <td style="padding: 8px;">${examName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">תאריך סיום:</td>
            <td style="padding: 8px;">${dateStr}</td>
          </tr>
        </table>
        <hr style="border: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">נשלח אוטומטית ממערכת תבור</p>
      </div>
    `,
  });
}
