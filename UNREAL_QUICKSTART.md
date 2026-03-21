# Unreal Engine 5 × pixdrift — Quickstart Guide

> **Mål:** Från noll till fungerande Pixel Streaming på AWS på 4 veckor  
> **Nivå:** Du kan koda, men är ny på UE5  
> **Tid per vecka:** 10-20h

---

## DAG 1: Installera UE5

### Steg 1: Epic Games Launcher

```
1. Gå till: https://www.unrealengine.com
2. Klicka "Download" → Välj "Publishing license" (gratis för kommersiellt bruk)
3. Ladda ner Epic Games Launcher (Windows installer)
4. Installera Launcher
5. Skapa konto (eller logga in med befintligt)
```

### Steg 2: Installera Unreal Engine 5.4

```
1. Öppna Epic Games Launcher
2. Klick på "Unreal Engine" i vänstermenyn
3. Library-fliken → "+" vid Engine Versions
4. Välj version: 5.4.x (senaste stable)
5. Klicka Install
   ⚠️ VARNING: 175GB disk krävs. Börja nedladdningen på kvällen.
6. Vänta (4-8 timmar beroende på uppkoppling)
```

### Steg 3: Skapa pixdrift Demo-projekt

```
1. Starta UE5 via Epic Launcher
2. Välj projekt-mall: Games → Blank
3. Settings:
   - Blueprint (ej C++ — vi börjar enkelt)
   - Quality: Maximum
   - Target Platform: Desktop
   - Raytracing: Enabled (om GPU stödjer)
4. Projektnamn: pixdrift_demo
5. Plats: C:\Projects\pixdrift_demo
6. Klicka Create Project
```

### Steg 4: Aktivera Pixel Streaming Plugin

```
1. I UE5: Edit → Plugins
2. Sök: "Pixel Streaming"
3. Aktivera: PixelStreaming ✓
4. Aktivera: PixelStreamingInfra ✓ (om tillgänglig)
5. Klicka Restart Now
6. UE5 startar om med Pixel Streaming aktiverat
```

### Steg 5: Grundläggande scen

```
1. Radera standard-objekten i scenen (välj allt, Delete)
2. Lägg till golv:
   Place Actors Panel → sök "Plane" → dra ut i scenen
   Scale: X=10, Y=10, Z=1
   
3. Lägg till väggar (4st Box-meshes runt golvet)

4. Lägg till ljus:
   Place Actors → Lights → Directional Light (solljus)
   + Sky Atmosphere (himmel)
   
5. Importera pixdrift-logotyp:
   Content Browser → Import → välj pixdrift-logo.png
   Skapa Material med logotyp-textur
   Applicera på en vägg-plane
   
6. Tryck Play → Se din scen! (fortfarande lokal)
```

---

## VECKA 1: Lokal Pixel Streaming Test

### Steg 6: Starta Signal Server (lokalt)

Signal Server och Pixel Streaming frontend finns med i UE5-installationen:

```powershell
# Hitta Pixel Streaming samples
cd "C:\Program Files\Epic Games\UE_5.4\Samples\PixelStreaming\WebServers"

# Starta Signaling Server
cd SignallingWebServer
node run_local.js
# Output: Listening on port 80 for connections...
```

Om Node.js inte är installerat:
```
https://nodejs.org → LTS version → Installera
```

### Steg 7: Starta UE5 med Pixel Streaming

```
Metod 1: Via Editor
  1. Edit → Editor Preferences → Level Editor → Play
  2. Launch Profile → Add Launch Profile
  3. Klistra in i "Additional Launch Parameters":
     -PixelStreamingURL=ws://localhost:8888 -RenderOffscreen

Metod 2: Via kommandorad (enklare för test)
  1. File → Package Project → Windows → Välj output-mapp
  2. Vänta på packaging (5-15 min)
  3. Öppna PowerShell, navigera till output:
  
cd C:\Projects\pixdrift_demo_packaged\Windows

.\pixdrift_demo.exe ^
  -PixelStreamingURL=ws://localhost:8888 ^
  -RenderOffscreen ^
  -ResX=1920 -ResY=1080 ^
  -AudioMixer
```

### Steg 8: Testa i webbläsaren

```
1. Öppna Chrome (rekommenderat för WebRTC)
2. Gå till: http://localhost
3. Klicka Play-knappen på sidan
4. 🎉 Du ser din UE5-scen streamad i webbläsaren!

Testa interaktion:
- WASD: Rör dig i scenen
- Mus: Rotera kamera
- Klick: Interagera med objekt (om Blueprint-logik finns)
```

---

## VECKA 2: AWS Setup

### Steg 9: Förbered AWS-konto

```bash
# Installera AWS CLI
# https://aws.amazon.com/cli/ → Ladda ner Windows installer

# Konfigurera credentials
aws configure
# AWS Access Key ID: [Din nyckel]
# AWS Secret Access Key: [Din hemliga nyckel]  
# Default region: eu-west-1  (Ireland — närmast Sverige med GPU)
# Default output format: json

# Verifiera
aws sts get-caller-identity
```

### Steg 10: Skapa Security Group för UE5 Pixel Streaming

```bash
# Skapa Security Group
aws ec2 create-security-group \
  --group-name pixdrift-ue5-sg \
  --description "Pixel Streaming Security Group" \
  --region eu-west-1

# Spara Group ID från output: sg-XXXXXXXXXXXXXXXXX

# Öppna nödvändiga portar
SG_ID="sg-XXXXXXXXXXXXXXXXX"  # Ersätt med ditt Security Group ID

# HTTPS - Signaling
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp --port 443 --cidr 0.0.0.0/0

# Pixel Streaming WebSocket
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp --port 8888 --cidr 0.0.0.0/0

# WebRTC media (UDP range)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol udp --port 19302-19309 --cidr 0.0.0.0/0

# TURN server
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol udp --port 3478 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp --port 3478 --cidr 0.0.0.0/0

# RDP för admin (VIKTIGT: begränsa till din IP!)
MY_IP=$(curl -s https://api.ipify.org)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp --port 3389 --cidr ${MY_IP}/32

# HTTP för Signal Server frontend
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp --port 80 --cidr 0.0.0.0/0
```

### Steg 11: Hitta rätt AMI (NVIDIA GPU Windows)

```bash
# Sök efter NVIDIA Gaming AMI i eu-west-1
aws ec2 describe-images \
  --owners aws-marketplace \
  --filters "Name=name,Values=*NVIDIA*Windows*" \
  --query 'Images[*].[ImageId,Name,CreationDate]' \
  --output table \
  --region eu-west-1

# Alternativt: Använd AWS Deep Learning AMI (Windows)
aws ec2 describe-images \
  --owners amazon \
  --filters \
    "Name=name,Values=*Windows*Server*2022*NVIDIA*" \
    "Name=state,Values=available" \
  --query 'sort_by(Images, &CreationDate)[-1].[ImageId,Name]' \
  --output text \
  --region eu-west-1
```

**Rekommenderat:** Gå till AWS Marketplace manuellt:
1. https://aws.amazon.com/marketplace
2. Sök: "NVIDIA Gaming PC Windows"
3. Välj: "NVIDIA Gaming PC — Windows Server 2022"
4. Välj region eu-west-1 → Notera AMI ID

### Steg 12: Starta EC2 g4dn.xlarge

```bash
# Skapa SSH key pair (för admin)
aws ec2 create-key-pair \
  --key-name pixdrift-ue5-key \
  --query 'KeyMaterial' \
  --output text > pixdrift-ue5-key.pem

# Starta instansen
aws ec2 run-instances \
  --image-id ami-XXXXXXXXXXXXXXX \
  --instance-type g4dn.xlarge \
  --key-name pixdrift-ue5-key \
  --security-group-ids sg-XXXXXXXXXXXXXXXXX \
  --count 1 \
  --tag-specifications \
    'ResourceType=instance,Tags=[{Key=Name,Value=pixdrift-ue5-poc}]' \
  --region eu-west-1

# Hämta public IP
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=pixdrift-ue5-poc" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text \
  --region eu-west-1

# ⚠️ KOSTNAD: g4dn.xlarge = $0.526/h i eu-west-1
# Stoppa instansen när du inte jobbar:
# aws ec2 stop-instances --instance-ids i-XXXXXXXXXXXXXXXXX
```

### Steg 13: Anslut via RDP och installera UE5

```
1. Hämta Windows lösenord:
   aws ec2 get-password-data \
     --instance-id i-XXXXXXXXXXXXXXXXX \
     --priv-launch-key pixdrift-ue5-key.pem

2. Anslut via Remote Desktop (Windows RDP):
   - Server: <EC2 Public IP>:3389
   - Användare: Administrator
   - Lösenord: [från steg ovan]

3. På EC2-instansen:
   a. Ladda ner Epic Games Launcher
   b. Installera UE5 5.4
   c. Kopiera ditt pixdrift_demo-projekt:
      - Paketera projektet lokalt: File → Package → Windows
      - Ladda upp till EC2 via RDP clipboard eller S3:

# Ladda upp packad build till S3
aws s3 cp C:\Projects\pixdrift_demo_packaged\ \
  s3://pixdrift-ue5-assets/builds/latest/ \
  --recursive

# Ladda ner på EC2
aws s3 cp s3://pixdrift-ue5-assets/builds/latest/ \
  C:\pixdrift_demo\ \
  --recursive
```

### Steg 14: Starta Pixel Streaming på EC2

```powershell
# På EC2-instansen (PowerShell som Administrator)

# 1. Installera Node.js om det saknas
winget install OpenJS.NodeJS.LTS

# 2. Navigera till Signal Server (om UE5 installerat)
cd "C:\Program Files\Epic Games\UE_5.4\Samples\PixelStreaming\WebServers\SignallingWebServer"
npm install

# 3. Starta Signal Server
node runlocal.js --publicIp=<EC2-PUBLIC-IP>

# 4. Öppna nytt PowerShell-fönster, starta UE5-appen
cd C:\pixdrift_demo\Windows

.\pixdrift_demo.exe `
  -PixelStreamingURL=ws://localhost:8888 `
  -RenderOffscreen `
  -ResX=1920 -ResY=1080 `
  -AudioMixer `
  -ForceRes

# 5. Testa! Öppna Chrome lokalt:
# http://<EC2-PUBLIC-IP>
# Du ska se din UE5-scen!
```

---

## VECKA 3: Pixel Streaming Frontend Setup

### Steg 15: Anpassa Pixel Streaming frontend

```javascript
// Ladda ner Epic's officiella frontend
// https://github.com/EpicGamesExt/PixelStreamingInfrastructure

git clone https://github.com/EpicGamesExt/PixelStreamingInfrastructure
cd PixelStreamingInfrastructure/Frontend/implementations/react

npm install

// Anpassa src/App.tsx för pixdrift-branding:
// - Lägg till pixdrift-logotyp
// - Ändra bakgrundsfärg till pixdrift brand
// - Anpassa loading-screen text

npm run build
// Output i dist/ → ladda upp till S3
```

### Steg 16: Skicka events från webbsida till UE5

```javascript
// I din React/Next.js-app
import { PixelStreaming } from '@epicgames-ps/lib-pixelstreamingfrontend-ue5.4';

const pixelStreaming = new PixelStreaming({
  signalingServerAddress: 'wss://demo.pixdrift.com',
  signalingServerPort: 443
});

// Skicka användardata till UE5 när session startar
pixelStreaming.addEventListener('playStreamRejected', (e) => {
  console.log('Stream rejected:', e.reason);
});

pixelStreaming.addEventListener('videoInitialized', () => {
  // Skicka användarens namn till UE5-scenen
  pixelStreaming.emitUIInteraction({
    action: 'setUserName',
    name: userName,
    company: companyName
  });
});

// Ta emot events från UE5 (t.ex. när scen laddats)
pixelStreaming.addPlayerEventListener('scene_ready', (data) => {
  console.log('UE5 scene ready:', data);
  hideLoadingScreen();
});
```

### Steg 17: Blueprint för att ta emot events

```
I UE5 Blueprint (BP_PixelStreamingManager):

Event: Receive Pixel Streaming Data
  ├── Parse JSON Input
  ├── Switch on "action":
  │   ├── "setUserName":
  │   │   └── Set Variable: PlayerName
  │   │       Update Text3D Actor: "Välkommen, {PlayerName}!"
  │   ├── "loadModule":
  │   │   └── Load Level: L_ExecutionRoom
  │   └── "resetDemo":
  │       └── Load Level: L_MainOffice

// Skicka event TILLBAKA till webbläsaren:
// Node: Send Pixel Streaming Response
// Data: {"event": "module_complete", "module": "execution"}
```

---

## VECKA 4: Embed på pixdrift.com

### Steg 18: Next.js-komponent för Pixel Streaming

```typescript
// components/PixelStreamingDemo.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

interface DemoSession {
  streamUrl: string;
  sessionId: string;
}

export default function PixelStreamingDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<DemoSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startDemo = async (email: string, name: string) => {
    setLoading(true);
    try {
      // Allokera GPU-instans via din backend
      const response = await fetch('/api/demo/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      });
      
      if (!response.ok) {
        throw new Error('Ingen GPU-instans tillgänglig just nu');
      }
      
      const data: DemoSession = await response.json();
      setSession(data);
      
      // Logga lead i pixdrift
      await fetch('/api/leads', {
        method: 'POST',
        body: JSON.stringify({ email, name, source: 'ue5_demo' })
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel');
    } finally {
      setLoading(false);
    }
  };

  // Dynamically load Pixel Streaming library
  useEffect(() => {
    if (!session || !containerRef.current) return;
    
    const script = document.createElement('script');
    script.src = '/pixel-streaming/player.js';
    script.onload = () => {
      // @ts-ignore
      window.initPixelStreaming({
        container: containerRef.current,
        signalingServer: session.streamUrl,
        autoConnect: true
      });
    };
    document.head.appendChild(script);
    
    return () => {
      document.head.removeChild(script);
    };
  }, [session]);

  if (!session) {
    return (
      <DemoStartForm 
        onStart={startDemo}
        loading={loading}
        error={error}
      />
    );
  }

  return (
    <div className="relative w-full h-screen bg-black">
      <div ref={containerRef} className="w-full h-full" />
      {/* Loading overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 demo-loading">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p>Startar pixdrift-världen...</p>
          <p className="text-sm text-gray-400 mt-2">Detta tar 15-30 sekunder</p>
        </div>
      </div>
    </div>
  );
}
```

### Steg 19: API Route för session-allokering

```typescript
// app/api/demo/allocate/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { email, name } = await request.json();
  
  try {
    // Kontakta Matchmaker-servern
    const matchmakerResponse = await fetch(
      `${process.env.MATCHMAKER_URL}/api/request-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MATCHMAKER_SECRET}`
        },
        body: JSON.stringify({ 
          userEmail: email,
          userName: name,
          maxSessionMinutes: 30
        })
      }
    );
    
    if (!matchmakerResponse.ok) {
      return NextResponse.json(
        { error: 'Kapacitetsgräns nådd' },
        { status: 503 }
      );
    }
    
    const { streamUrl, sessionId } = await matchmakerResponse.json();
    
    return NextResponse.json({ streamUrl, sessionId });
    
  } catch (error) {
    console.error('Matchmaker error:', error);
    return NextResponse.json(
      { error: 'Internt fel' },
      { status: 500 }
    );
  }
}
```

### Steg 20: Demo-sida på pixdrift.com

```typescript
// app/demo/page.tsx
import PixelStreamingDemo from '@/components/PixelStreamingDemo';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Upplev pixdrift i 3D | Interaktiv Demo',
  description: 'Kliv in i Novacode AB och upplev pixdrift live — inga möten, ingen installation.',
};

export default function DemoPage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="py-20 text-center bg-gradient-to-b from-black to-gray-900">
        <h1 className="text-5xl font-bold text-white mb-4">
          Upplev pixdrift i 3D
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          Kliv in i Novacode AB — ett fiktivt företag som kör pixdrift — 
          och utforska systemet på dina egna villkor. Ingen säljare. Ingen installation.
        </p>
        <div className="flex gap-4 justify-center text-sm text-gray-500">
          <span>✓ Fungerar i Chrome/Edge/Safari</span>
          <span>✓ Ingen installation</span>
          <span>✓ 5-15 minuter</span>
        </div>
      </section>
      
      {/* Demo */}
      <PixelStreamingDemo />
    </main>
  );
}
```

---

## Matchmaker Server (Node.js)

```javascript
// matchmaker/server.js — Enkel version för POC
const express = require('express');
const { EC2Client, StartInstancesCommand, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');

const app = express();
app.use(express.json());

const ec2 = new EC2Client({ region: 'eu-west-1' });

// Pool av GPU-instanser (hårdkodat för POC)
const INSTANCE_POOL = [
  { instanceId: 'i-XXXXXXXXXXXXXXXXX', status: 'idle', ip: null }
];

app.post('/api/request-session', async (req, res) => {
  const { userEmail, userName } = req.body;
  
  // Hitta ledig instans
  const available = INSTANCE_POOL.find(i => i.status === 'idle');
  
  if (!available) {
    return res.status(503).json({ error: 'Alla demo-platser är upptagna' });
  }
  
  // Markera som "i bruk"
  available.status = 'starting';
  
  try {
    // Starta EC2 om den är stoppad
    await ec2.send(new StartInstancesCommand({
      InstanceIds: [available.instanceId]
    }));
    
    // Vänta på att instansen är redo (förenklat)
    await waitForInstance(available.instanceId);
    
    // Hämta IP
    const instanceData = await ec2.send(new DescribeInstancesCommand({
      InstanceIds: [available.instanceId]
    }));
    const ip = instanceData.Reservations[0].Instances[0].PublicIpAddress;
    
    available.ip = ip;
    available.status = 'running';
    available.sessionStart = Date.now();
    available.userEmail = userEmail;
    
    // Auto-stop efter 30 minuter
    setTimeout(() => releaseInstance(available), 30 * 60 * 1000);
    
    res.json({
      streamUrl: `wss://${ip}:443`,
      sessionId: `session_${Date.now()}`
    });
    
  } catch (error) {
    available.status = 'idle';
    res.status(500).json({ error: 'Kunde inte starta demo-server' });
  }
});

// Frigör instans
const releaseInstance = async (instance) => {
  // Stoppa EC2 för att spara pengar
  await ec2.send(new StopInstancesCommand({
    InstanceIds: [instance.instanceId]
  }));
  instance.status = 'idle';
  instance.ip = null;
  instance.userEmail = null;
  console.log(`Instance ${instance.instanceId} released and stopped`);
};

app.listen(3001, () => console.log('Matchmaker running on :3001'));
```

---

## Kostnadskontroll: Stoppa när du inte jobbar

```bash
# ⚠️ VIKTIGT: g4dn.xlarge kostar $0.52/h även när idle

# Stoppa instansen efter varje arbetspass
INSTANCE_ID="i-XXXXXXXXXXXXXXXXX"
aws ec2 stop-instances --instance-ids $INSTANCE_ID --region eu-west-1

# Verifiera att den är stoppad
aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].State.Name' \
  --output text \
  --region eu-west-1
# Output: "stopped"  ← Då kostar den $0

# Starta igen när du behöver jobba
aws ec2 start-instances --instance-ids $INSTANCE_ID --region eu-west-1

# Sätt upp budget-alarm i AWS
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget '{
    "BudgetName": "pixdrift-ue5-poc",
    "BudgetLimit": {"Amount": "50", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[{
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80
    },
    "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "erik@pixdrift.com"}]
  }]'
```

---

## Felsökning

### Problem: Webbläsare kan inte ansluta till stream

```bash
# Kontrollera att Security Group tillåter port 8888
aws ec2 describe-security-groups \
  --group-ids sg-XXXXXXXXXXXXXXXXX \
  --query 'SecurityGroups[0].IpPermissions'

# Kontrollera att Signal Server körs på EC2
# (RDP in och kör):
netstat -an | findstr 8888
# Ska visa: TCP 0.0.0.0:8888 LISTENING

# Kontrollera att UE5-processen körs:
tasklist | findstr pixdrift_demo
```

### Problem: Hög latens (> 200ms)

```
Orsaker och lösningar:
1. Fel AWS-region → Byt till eu-west-1 (Ireland)
2. NAT-traversal misslyckas → Aktivera TURN-server
3. Låg GPU-kapacitet → Sänk upplösning till 720p
4. Nätverksflaskhals → Sänk target bitrate till 10Mbps

I DefaultPixelStreaming.ini:
[/Script/PixelStreaming.PixelStreamingSettings]
WebRTCMaxBitrate=10000000
WebRTCFps=30
WebRTCMinBitrate=1000000
```

### Problem: UE5 krachar på EC2

```
Vanliga orsaker:
1. För lite VRAM → g4dn.xlarge har 16GB, bör räcka
2. GPU-driver för gammal → Uppdatera NVIDIA driver
3. UE5 render-inställningar för höga:
   Project Settings → Rendering → 
   Sänk Shadow quality
   Inaktivera Lumen (dyr feature) för POC

Loggar finns i:
C:\pixdrift_demo\Saved\Logs\pixdrift_demo.log
```

---

## Nästa Steg efter POC

När du har fungerande Pixel Streaming:

```
□ Lägg till MetaHuman-guide (MetaHuman Creator)
□ Anslut till pixdrift API (Blueprint HTTP-noder)
□ Bygg rum 2: Execution-modulen
□ Lägg till quiz-funktion (Blueprint + UMG)
□ Implementera Matchmaker för multi-session
□ CloudFront för WebSocket (lägre latens i Europa)
□ Sätt upp CloudWatch monitoring
□ Börja bygga Training Scenario 1
```

---

## Resurser och Kontakter

```
Epic Games Support:     https://www.unrealengine.com/support
UE5 Documentation:      https://docs.unrealengine.com/5.4/
Pixel Streaming Guide:  https://docs.unrealengine.com/5.4/en-US/pixel-streaming-in-unreal-engine/
MetaHuman Creator:      https://metahuman.unrealengine.com/
Pixel Streaming Infra:  https://github.com/EpicGamesExt/PixelStreamingInfrastructure

AWS Support:            https://aws.amazon.com/support/
EC2 g4dn docs:          https://aws.amazon.com/ec2/instance-types/g4/
AWS Pixel Streaming:    https://aws.amazon.com/solutions/partners/pixel-streaming/

pixdrift API docs:      https://pixdrift.com/api/docs (intern)
```

---

*Lyckad streaming! 🚀*  
*Frågor eller problem: Se UE5-community eller öppna issue i pixdrift-repot*
