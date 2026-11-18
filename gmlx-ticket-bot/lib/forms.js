const {
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
} = require('discord.js');

const S = TextInputStyle.Short;
const P = TextInputStyle.Paragraph;

// Form shown BEFORE the ticket is created (depends on the button pressed)
const FORMS = {
  help: {
    en: {
      title: 'Help Ticket',
      fields: [
        { id: 'problem', label: 'Problem', style: S, required: true, ph: 'What is the problem?', max: 100 },
        { id: 'details', label: 'Description', style: P, required: true, ph: 'Explain what happened in detail...', max: 1000 },
        { id: 'extra', label: 'Order ID / Extra (optional)', style: S, required: false, ph: 'Order ID, link, username...', max: 100 },
      ],
    },
    es: {
      title: 'Ticket de Ayuda',
      fields: [
        { id: 'problem', label: 'Problema', style: S, required: true, ph: '¿Cuál es el problema?', max: 100 },
        { id: 'details', label: 'Descripción', style: P, required: true, ph: 'Explica lo que pasó con detalle...', max: 1000 },
        { id: 'extra', label: 'ID de orden / Extra (opcional)', style: S, required: false, ph: 'ID de orden, link, usuario...', max: 100 },
      ],
    },
  },
  buy: {
    en: {
      title: 'Purchase Ticket',
      fields: [
        { id: 'product', label: 'Product', style: S, required: true, ph: 'What do you want to buy?', max: 100 },
        { id: 'payment', label: 'Payment method', style: S, required: true, ph: 'PayPal, Cash App, Zelle, crypto...', max: 100 },
        { id: 'details', label: 'Notes (optional)', style: P, required: false, ph: 'Quantity, extra details...', max: 1000 },
      ],
    },
    es: {
      title: 'Ticket de Compra',
      fields: [
        { id: 'product', label: 'Producto', style: S, required: true, ph: '¿Qué deseas comprar?', max: 100 },
        { id: 'payment', label: 'Método de pago', style: S, required: true, ph: 'PayPal, Cash App, Zelle, cripto...', max: 100 },
        { id: 'details', label: 'Notas (opcional)', style: P, required: false, ph: 'Cantidad, detalles extra...', max: 1000 },
      ],
    },
  },
};

function buildModal(key, type, lang) {
  const form = FORMS[type][lang];
  return new ModalBuilder()
    .setCustomId(`ticketmodal:${key}`)
    .setTitle(form.title)
    .addComponents(
      form.fields.map((f) =>
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(f.id)
            .setLabel(f.label)
            .setStyle(f.style)
            .setRequired(f.required)
            .setPlaceholder(f.ph)
            .setMaxLength(f.max)
        )
      )
    );
}

module.exports = { FORMS, buildModal };
