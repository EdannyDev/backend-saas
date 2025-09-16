import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { google } from "googleapis";
dotenv.config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN!;
const GMAIL_USER = process.env.GOOGLE_EMAIL!;
const REDIRECT_URI = "https://developers.google.com/oauthplayground";

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

export async function sendResetEmail(
  to: string,
  name: string,
  tempPassword: string
): Promise<void> {
  try {
    const accessTokenResponse = await oAuth2Client.getAccessToken();
    const accessToken = accessTokenResponse?.token;

    if (!accessToken) {
      throw new Error("No se pudo obtener el token de acceso de Google.");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: GMAIL_USER,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken,
      },
    });

    const mailOptions = {
      from: `"Techno Support" <${GMAIL_USER}>`,
      to,
      subject: "Restablecimiento de contraseña temporal",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; padding: 24px;">
            <h2 style="margin-top: 0; color: #1a202c;">Techno Support</h2>
            <p>Hola <strong>${name}</strong>,</p>
            <p>Has solicitado restablecer tu contraseña. Usa la siguiente contraseña temporal para iniciar sesión:</p>
            <p style="text-align: center; font-weight: bold; font-size: 18px; background: #e2e8f0; padding: 12px; border-radius: 4px;">
              ${tempPassword}
            </p>
            <p>Esta contraseña es válida por 5 minutos. Una vez que ingreses, actualiza tu contraseña desde tu perfil.</p>
            <p>Si no solicitaste este cambio, ignora este correo.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0;" />
            <p style="font-size: 12px; color: #718096; text-align: center;">© ${new Date().getFullYear()} Techno Support</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Correo de restablecimiento enviado`);
  } catch (error: any) {
    console.error("Error enviando correo de restablecimiento:", error);
    throw new Error("No se pudo enviar el correo de restablecimiento");
  }
}