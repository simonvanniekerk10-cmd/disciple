import PersonalPrayerSection from "@/components/prayer/PersonalPrayerSection";
import CorporatePrayerSection from "@/components/prayer/CorporatePrayerSection";
import TestimoniesSection from "@/components/prayer/TestimoniesSection";

export default function Prayer() {
  return (
    <div className="px-5 pt-6 pb-10 space-y-8">
      <h1 className="text-2xl font-bold">Prayer</h1>
      <PersonalPrayerSection />
      <CorporatePrayerSection />
      <TestimoniesSection />
    </div>
  );
}