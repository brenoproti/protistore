import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { config } from "../config";
import { logger } from "../logger";
import type { Order, OrderItem } from "../types";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!config.smtpHost) {
    logger.debug("SMTP not configured — email disabled");
    return null;
  }
  if (!transporter) {
    logger.info({ host: config.smtpHost, port: config.smtpPort, user: config.smtpUser }, "Initializing SMTP transporter");
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });
  }
  return transporter;
}

const brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function formatBRL(value: number): string {
  return brlFmt.format(value);
}

function buildItemsTable(items: OrderItem[]): string {
  return items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${item.product_name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">${formatBRL(item.total)}</td>
        </tr>`
    )
    .join("");
}

function orderConfirmationHtml(order: Order, storeName: string): string {
  const deliveryLabel = order.delivery_method === "pickup" ? "Retirada na Loja" : "Entrega";
  const addressBlock =
    order.delivery_method === "delivery"
      ? `<p style="margin:4px 0;color:#64748b;">${order.shipping_address}<br/>${order.shipping_city}, ${order.shipping_state} ${order.shipping_zip}</p>`
      : "";

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#6366f1,#7c3aed);padding:28px 24px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">${storeName}</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Confirmação de Pedido</p>
      </div>

      <div style="padding:24px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;width:48px;height:48px;border-radius:50%;background:#dcfce7;line-height:48px;font-size:24px;">✓</div>
          <h2 style="margin:12px 0 4px;font-size:18px;color:#0f172a;">Pedido Confirmado!</h2>
          <p style="margin:0;color:#64748b;font-size:14px;">Obrigado pela sua compra, ${order.customer_name.split(" ")[0]}.</p>
        </div>

        <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;">
          <table style="width:100%;font-size:14px;color:#334155;">
            <tr><td style="padding:4px 0;color:#64748b;">Pedido</td><td style="padding:4px 0;text-align:right;font-weight:600;color:#6366f1;">${order.order_number}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b;">Entrega</td><td style="padding:4px 0;text-align:right;">${deliveryLabel}</td></tr>
          </table>
          ${addressBlock}
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#334155;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:8px 12px;text-align:left;font-weight:600;font-size:13px;color:#64748b;">Produto</th>
              <th style="padding:8px 12px;text-align:center;font-weight:600;font-size:13px;color:#64748b;">Qtd</th>
              <th style="padding:8px 12px;text-align:right;font-weight:600;font-size:13px;color:#64748b;">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${buildItemsTable(order.items ?? [])}
          </tbody>
        </table>

        <div style="margin-top:16px;padding-top:12px;border-top:2px solid #e2e8f0;text-align:right;">
          <span style="font-size:13px;color:#64748b;">Total: </span>
          <span style="font-size:18px;font-weight:700;color:#0f172a;">${formatBRL(order.total)}</span>
        </div>
      </div>

      <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #f1f5f9;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">${storeName} — Obrigado por comprar conosco!</p>
      </div>
    </div>
  </div>
</body></html>`;
}

function statusUpdateHtml(order: Order, storeName: string): string {
  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    confirmed: "Confirmado",
    processing: "Em Processamento",
    shipped: "Enviado",
    delivered: "Entregue",
    cancelled: "Cancelado",
  };
  const statusColors: Record<string, string> = {
    pending: "#eab308",
    confirmed: "#3b82f6",
    processing: "#6366f1",
    shipped: "#8b5cf6",
    delivered: "#22c55e",
    cancelled: "#ef4444",
  };
  const label = statusLabels[order.status] || order.status;
  const color = statusColors[order.status] || "#6366f1";

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <div style="background:linear-gradient(135deg,#6366f1,#7c3aed);padding:28px 24px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">${storeName}</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Atualização de Pedido</p>
      </div>

      <div style="padding:24px;text-align:center;">
        <p style="margin:0 0 8px;font-size:14px;color:#64748b;">Pedido <strong style="color:#6366f1;">${order.order_number}</strong></p>
        <h2 style="margin:0 0 16px;font-size:18px;color:#0f172a;">Status Atualizado</h2>
        <div style="display:inline-block;padding:8px 20px;border-radius:20px;background:${color}15;color:${color};font-weight:600;font-size:15px;">
          ${label}
        </div>
        <p style="margin:20px 0 0;font-size:14px;color:#64748b;">
          ${order.status === "shipped" ? "Seu pedido está a caminho!" : order.status === "delivered" ? "Seu pedido foi entregue. Aproveite!" : order.status === "cancelled" ? "Seu pedido foi cancelado. Entre em contato caso tenha dúvidas." : `O status do seu pedido foi atualizado para "${label}".`}
        </p>
      </div>

      <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #f1f5f9;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">${storeName} — Obrigado por comprar conosco!</p>
      </div>
    </div>
  </div>
</body></html>`;
}

export async function sendOrderConfirmation(order: Order, storeName: string): Promise<void> {
  const t = getTransporter();
  if (!t) return;

  try {
    await t.sendMail({
      from: `"${storeName}" <${config.smtpFrom}>`,
      to: order.customer_email,
      subject: `Pedido ${order.order_number} confirmado — ${storeName}`,
      html: orderConfirmationHtml(order, storeName),
    });
    logger.info(`Order confirmation sent to ${order.customer_email}`);
  } catch (err) {
    logger.error(err, "Failed to send order confirmation");
  }
}

export async function notifyStoreNewOrder(order: Order, storeName: string, adminEmails: string[]): Promise<void> {
  const t = getTransporter();
  if (!t || adminEmails.length === 0) return;

  const itemsCount = (order.items ?? []).reduce((sum, i) => sum + i.quantity, 0);

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <div style="background:linear-gradient(135deg,#f59e0b,#f97316);padding:28px 24px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Novo Pedido!</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${storeName}</p>
      </div>

      <div style="padding:24px;">
        <div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:8px;padding:16px;margin-bottom:20px;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;color:#92400e;">Pedido</p>
          <p style="margin:0;font-size:20px;font-weight:700;color:#b45309;">${order.order_number}</p>
        </div>

        <table style="width:100%;font-size:14px;color:#334155;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#64748b;">Cliente</td><td style="padding:6px 0;text-align:right;font-weight:600;">${order.customer_name}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">E-mail</td><td style="padding:6px 0;text-align:right;">${order.customer_email}</td></tr>
          ${order.customer_phone ? `<tr><td style="padding:6px 0;color:#64748b;">Telefone</td><td style="padding:6px 0;text-align:right;">${order.customer_phone}</td></tr>` : ""}
          <tr><td style="padding:6px 0;color:#64748b;">Itens</td><td style="padding:6px 0;text-align:right;">${itemsCount} item(ns)</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Entrega</td><td style="padding:6px 0;text-align:right;">${order.delivery_method === "pickup" ? "Retirada" : "Entrega"}</td></tr>
          <tr style="border-top:2px solid #e2e8f0;"><td style="padding:10px 0 0;font-weight:600;">Total</td><td style="padding:10px 0 0;text-align:right;font-weight:700;font-size:18px;color:#0f172a;">${formatBRL(order.total)}</td></tr>
        </table>

        ${buildItemsTable(order.items ?? [])}
      </div>

      <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #f1f5f9;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">Acesse o painel admin para gerenciar este pedido.</p>
      </div>
    </div>
  </div>
</body></html>`;

  try {
    await t.sendMail({
      from: `"${storeName}" <${config.smtpFrom}>`,
      to: adminEmails.join(", "),
      subject: `Novo pedido ${order.order_number} — ${formatBRL(order.total)}`,
      html,
    });
    logger.info("New order notification sent to store admins");
  } catch (err) {
    logger.error(err, "Failed to notify store admins");
  }
}

export async function sendStatusUpdate(order: Order, storeName: string): Promise<void> {
  const t = getTransporter();
  if (!t) return;

  try {
    await t.sendMail({
      from: `"${storeName}" <${config.smtpFrom}>`,
      to: order.customer_email,
      subject: `Pedido ${order.order_number} — Status atualizado — ${storeName}`,
      html: statusUpdateHtml(order, storeName),
    });
    logger.info(`Status update sent to ${order.customer_email}`);
  } catch (err) {
    logger.error(err, "Failed to send status update");
  }
}
