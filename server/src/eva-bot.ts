import { Router, Request, Response } from 'express';

const router = Router();

const EVA_BOT_TOKEN = '8653325749:AAFdr6bfC1Na6IA7Mu_SoRPWKzVrqbQwMMM';
const TELEGRAM_API = `https://api.telegram.org/bot${EVA_BOT_TOKEN}`;

async function sendMessage(chat_id: number, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text, parse_mode: 'HTML' }),
  });
}

// Webhook från Telegram
router.post('/webhook', async (req: Request, res: Response) => {
  res.sendStatus(200); // Svara direkt till Telegram
  
  const { message } = req.body;
  if (!message?.text) return;
  
  const chat_id = message.chat.id;
  const text = message.text.toLowerCase().trim();
  const name = message.from?.first_name || 'du';
  
  // Routing
  if (text === '/start' || text === 'hej' || text === 'hello' || text === 'hi') {
    await sendMessage(chat_id, 
      `👋 Hej ${name}!\n\nJag är Evas assistent. Eva Svensson är ICF-certifierad coach med 30+ års erfarenhet.\n\nJag kan hjälpa dig med:\n📅 <b>Boka samtal</b> — skriv "boka"\n🎓 <b>Om tjänster</b> — skriv "tjänster"\n📖 <b>E-bok</b> — skriv "ebook"\n📞 <b>Kontakt</b> — skriv "kontakt"\n\nVad kan jag hjälpa dig med?`
    );
  } else if (text.includes('boka') || text.includes('book') || text.includes('samtal') || text.includes('möte')) {
    await sendMessage(chat_id,
      `📅 <b>Boka ett gratis strategisamtal</b>\n\n30 minuter för att få klarhet i din situation och dina nästa steg.\n\nKlicka här för att boka:\nhttps://calendly.com/evasvensson\n\nEller besök: https://www.evasvensson.se`
    );
  } else if (text.includes('tjänst') || text.includes('service') || text.includes('vad gör') || text.includes('erbjuder')) {
    await sendMessage(chat_id,
      `🎓 <b>Evas tjänster</b>\n\n<b>Professionshandledning för rektorer</b>\nStrukturerat stöd för skolledare i en komplex vardag.\n\n<b>Coaching & karriärcoachning</b>\nFör dig som vill ta nästa steg eller stärka ditt ledarskap.\n\n<b>Självledarskap & ledarskap</b>\nUtbildningar med fokus på praktisk tillämpning.\n\n<b>Workshops för effektiva team</b>\nPsykologisk trygghet, feedback och kommunikation.\n\n📅 Boka gratis samtal: https://calendly.com/evasvensson`
    );
  } else if (text.includes('ebook') || text.includes('e-bok') || text.includes('bok') || text.includes('feedback')) {
    await sendMessage(chat_id,
      `📖 <b>Ladda ner: Feedback som lyfter</b>\n\nEn praktisk guide till hur du ger feedback som stärker, utvecklar och skapar resultat.\n\n✅ Gratis\n✅ Direkt i din inkorg\n\nLadda ner här:\nhttps://www.evasvensson.se/feedback-som-lyfter`
    );
  } else if (text.includes('kontakt') || text.includes('contact') || text.includes('mail') || text.includes('email')) {
    await sendMessage(chat_id,
      `📞 <b>Kontakta Eva</b>\n\n🌐 Webb: https://www.evasvensson.se\n📅 Boka samtal: https://calendly.com/evasvensson\n\nEller boka direkt via den här boten — skriv "boka"!`
    );
  } else if (text.includes('pris') || text.includes('kostnad') || text.includes('kostar')) {
    await sendMessage(chat_id,
      `💰 <b>Priser</b>\n\nPriser varierar beroende på uppdrag och upplägg.\n\n📅 Boka ett gratis 30-minuters strategisamtal för att diskutera dina behov och få ett skräddarsytt förslag:\nhttps://calendly.com/evasvensson`
    );
  } else {
    await sendMessage(chat_id,
      `Tack för ditt meddelande! 🙏\n\nJag vidarebefordrar till Eva. Hon återkommer till dig så snart som möjligt.\n\nI mellantiden kan du:\n📅 Boka samtal: https://calendly.com/evasvensson\n🌐 Besök: https://www.evasvensson.se\n\nSkriv "tjänster" för att se vad Eva erbjuder.`
    );
  }
});

export default router;
