"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5map from "@amcharts/amcharts5/map";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import am5geodata_worldLow from "@amcharts/amcharts5-geodata/worldLow";
import am5geodata_data_countries from "@amcharts/amcharts5-geodata/data/countries";
import am5geodata_data_countries2 from "@amcharts/amcharts5-geodata/data/countries2";

interface LanguageData {
  name: string;
  countries: string[];
}

function normalizeCountryName(value: string) {
  return value
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const COUNTRY_ALIASES: Record<string, string[]> = {
  usa: ["US", "United States", "United States of America", "America"],
  us: ["US", "United States", "United States of America", "America"],
  america: ["US", "United States", "United States of America"],
  unitedstates: ["US", "United States", "United States of America"],
  unitedstatesofamerica: ["US", "United States", "United States of America"],

  uk: ["GB", "United Kingdom", "Britain", "Great Britain"],
  britain: ["GB", "United Kingdom", "Great Britain"],
  greatbritain: ["GB", "United Kingdom", "Britain"],

  capeverde: ["CV", "Cape Verde", "Cabo Verde"],
  caboVerde: ["CV", "Cape Verde", "Cabo Verde"],

  cotedivoire: ["CI", "Côte d'Ivoire", "Cote d'Ivoire", "Ivory Coast"],
  ivorycoast: ["CI", "Côte d'Ivoire", "Cote d'Ivoire", "Ivory Coast"],

  brunei: ["BN", "Brunei", "Brunei Darussalam"],

  czechia: ["CZ", "Czechia", "Czech Republic"],
  czechrepublic: ["CZ", "Czechia", "Czech Republic"],

  democraticrepublicofcongo: [
    "CD",
    "Democratic Republic of the Congo",
    "Democratic Republic of Congo",
    "DR Congo",
    "Congo, Democratic Republic of the",
  ],

  republicofcongo: [
    "CG",
    "Republic of the Congo",
    "Republic of Congo",
    "Congo",
  ],

  eswatini: ["SZ", "Eswatini", "Swaziland"],
  swaziland: ["SZ", "Eswatini", "Swaziland"],

  gambia: ["GM", "Gambia", "The Gambia"],
  thegambia: ["GM", "Gambia", "The Gambia"],

  laos: ["LA", "Laos", "Lao People's Democratic Republic"],
  laopeoplesdemocraticrepublic: ["LA", "Laos"],

  micronesia: ["FM", "Micronesia", "Federated States of Micronesia"],
  federatedstatesofmicronesia: ["FM", "Micronesia"],

  moldova: ["MD", "Moldova", "Republic of Moldova"],
  republicofmoldova: ["MD", "Moldova"],

  myanmar: ["MM", "Myanmar", "Burma"],
  burma: ["MM", "Myanmar"],

  palestine: [
    "PS",
    "Palestine",
    "State of Palestine",
    "Palestinian Territories",
  ],
  palestinianterritories: [
    "PS",
    "Palestine",
    "State of Palestine",
    "Palestinian Territories",
  ],

  russia: ["RU", "Russian Federation", "Russia"],

  reunion: ["RE", "Réunion", "Reunion"],

  saotomeandprincipe: ["ST", "São Tomé and Príncipe", "Sao Tome and Principe"],

  southkorea: ["KR", "Korea, South", "South Korea"],
  northkorea: ["KP", "Korea, North", "North Korea"],

  syria: ["SY", "Syria", "Syrian Arab Republic"],

  tanzania: ["TZ", "Tanzania", "Tanzania, United Republic of"],

  turkey: ["TR", "Turkey", "Türkiye"],
  turkiye: ["TR", "Turkey", "Türkiye"],

  vaticancity: ["VA", "Vatican City", "Holy See"],
  holysee: ["VA", "Vatican City", "Holy See"],

  venezuela: ["VE", "Venezuela", "Venezuela (Bolivarian Republic of)"],
  vietnam: ["VN", "Viet Nam", "Vietnam"],

  uae: ["AE", "United Arab Emirates", "UAE"],
  emirates: ["AE", "United Arab Emirates", "UAE"],
  unitedarabemirates: ["AE", "United Arab Emirates", "UAE"],
};

export default function MapWorld({ languages }: { languages: LanguageData[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedLang, setSelectedLang] = useState("");

  const selected = languages.find((l) => l.name === selectedLang);
  const highlightCountries = selected?.countries || [];

  const nameToIso = useMemo(() => {
    const map = new Map<string, string>();

    const addMap = (countryData: any) => {
      Object.keys(countryData || {}).forEach((iso2) => {
        const entries = countryData[iso2] || [];
        if (Array.isArray(entries)) {
          entries.forEach((name: string) => {
            map.set(normalizeCountryName(name), iso2.toUpperCase());
          });
        }
      });
    };

    addMap(am5geodata_data_countries);
    addMap(am5geodata_data_countries2);

    (am5geodata_worldLow as any).features?.forEach((feature: any) => {
      const name = feature.properties?.name;
      const id = feature.id;
      if (name && id) {
        map.set(normalizeCountryName(name), String(id).toUpperCase());
      }
    });

    return map;
  }, []);

  const highlightedISO = useMemo(() => {
    const result = new Set<string>();

    for (const country of highlightCountries) {
      const normalized = normalizeCountryName(country);
      const aliases = COUNTRY_ALIASES[normalized] || [];
      const candidates = [country, normalized, ...aliases];

      for (const candidate of candidates) {
        const found = nameToIso.get(normalizeCountryName(String(candidate)));
        if (found) {
          result.add(found);
          break;
        }
      }
    }

    return [...result];
  }, [highlightCountries, nameToIso]);

  useEffect(() => {
    if (!chartRef.current) return;

    const root = am5.Root.new(chartRef.current);
    root._logo?.dispose();
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5map.MapChart.new(root, {
        projection: am5map.geoNaturalEarth1(),
        panX: "translateX",
        panY: "translateY",
        wheelX: "zoom",
        wheelY: "zoom",
      }),
    );

    chart.set("zoomControl", am5map.ZoomControl.new(root, {}));

    const polygonSeries = chart.series.push(
      am5map.MapPolygonSeries.new(root, {
        geoJSON: am5geodata_worldLow as any,
      }),
    );

    polygonSeries.mapPolygons.template.setAll({
      tooltipText: "{name}",
      interactive: true,
      fill: am5.color(0xd1d5db),
      stroke: am5.color(0x555555),
    });

    polygonSeries.mapPolygons.template.states.create("hover", {
      fill: am5.color(0x93c5fd),
    });

    const applyFill = () => {
      polygonSeries.mapPolygons.each((polygon) => {
        const id = String(
          (polygon.dataItem?.dataContext as any)?.id || "",
        ).toUpperCase();
        polygon.set(
          "fill",
          am5.color(highlightedISO.includes(id) ? 0x2563eb : 0xd1d5db),
        );
      });
    };

    polygonSeries.events.on("datavalidated", applyFill);
    applyFill();

    return () => root.dispose();
  }, [highlightedISO]);

  return (
    <div className="flex flex-col">
      <div className="flex justify-center py-2">
        <input
          list="languages"
          value={selectedLang}
          onChange={(event) => setSelectedLang(event.target.value)}
          placeholder="Select a language..."
          className="w-64 rounded-lg border border-gray-300 px-3 py-2"
        />

        <datalist id="languages">
          {languages.map((language) => (
            <option key={language.name} value={language.name} />
          ))}
        </datalist>
      </div>

      {highlightCountries.length > 0 && (
        <div className="pb-2 text-center text-sm font-medium">
          Countries: {highlightCountries.join(", ")}
        </div>
      )}

      <div
        ref={chartRef}
        className="h-[420px] rounded-xl border shadow sm:h-[520px] lg:h-[620px]"
        style={{ width: "100%" }}
      />
    </div>
  );
}
