# SAGMA Interactive Machinery Explorer & Digital Twin

Interactive 3D Digital Twin, Courseware Library, and Technical Anatomy Explorer for industrial milling and grain processing machinery, built for the Southern African Grain Millers Association (SAGMA).

## 🚀 Live Equipment Fleet

1. **SAGMA Diagram 69(b) Vertical Bucket Elevator**
   - 8.55 m continuous vertical trunking with twin-screw take-up boot
   - 2.80 m/s scale-accurate bucket cycle kinematics
   - Crowned head drive pulley with backstop instantaneous sprag locking
   - Official 13-component technical register and engineering schematics

2. **Satake VBF Vertical Maize Degermer & Decorticator**
   - Vertical friction-assisted decortication and degermination principle
   - 75 kW main drive with 1,050 RPM rotor kinematics
   - Slotted screen cage, dual-opposed reversible beater bars, and bottom distribution spiral
   - Aspiration offal hood and CCU ammeter load feedback simulation
   - Official 12-component parts register and engineering drawings (Diagram 4(a) Isometric, Drawing 4(a) Exploded, Process Diagram 3)

## 🛠️ Technology Stack

- **3D Engine**: Three.js (WebGL / WebXR)
- **Bundler**: Vite
- **Styling**: Vanilla CSS (SAGMA Light Mode Industrial Design System)
- **Icons**: Lucide Icons
- **Deployment**: Vercel

## 📦 Getting Started

### Installation
\\\ash
npm install
\\\

### Local Development
\\\ash
npm run dev
\\\
The application will launch at \http://localhost:5173/\.

### Production Build
\\\ash
npm run build
\\\

## 📚 Technical Courseware Library

Access the in-app **Technical Library** modal to inspect official SAGMA diagrams, cross-sectional schematics, and the interactive parts register. Clicking any component in the register instantly highlights the mesh node in the 3D viewport and frames the camera.
