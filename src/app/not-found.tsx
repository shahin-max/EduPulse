import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";
import AcademySite from "@/components/academy-site";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return <AcademySite>
    <section className="not-found page-container" aria-labelledby="not-found-title">
      <p className="not-found-code" aria-hidden="true">404</p>
      <h1 id="not-found-title">This page took a different path.</h1>
      <p>The page you are looking for doesn&apos;t exist or may have moved. Let&apos;s get you back on track.</p>
      <div className="not-found-actions">
        <Button asChild size="lg"><Link href="/"><Home /> Back to home</Link></Button>
        <Button asChild size="lg" variant="outline"><Link href="/#courses">Explore programs <ArrowRight /></Link></Button>
      </div>
    </section>
  </AcademySite>;
}
