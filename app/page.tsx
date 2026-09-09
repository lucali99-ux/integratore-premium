import Hero from "@/components/Hero";
import Philosophy from "@/components/Philosophy";
import ProductType from "@/components/ProductType";
import ProductSequence from "@/components/ProductSequence";
import Ingredients from "@/components/Ingredients";
import Results from "@/components/Results";
import FinalCta from "@/components/FinalCta";
import Footer from "@/components/Footer";

/**
 * Narrazione:
 *   affermazione → filosofia → prodotto (tipografia, poi da vicino)
 *   → formula → dati → acquisto
 *
 * Il ritmo dei fondi alterna chiaro/scuro quattro volte. È il motivo
 * per cui ScrollProgress usa mix-blend-difference invece di tracciare
 * quale sezione gli sta passando sotto.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <Philosophy />
      <ProductType />
      <ProductSequence />
      <Ingredients />
      <Results />
      <FinalCta />
      <Footer />
    </>
  );
}
