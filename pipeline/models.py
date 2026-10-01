"""Schema the LLM must fill for each article. Keep the Literal lists in sync with data/taxonomy.json."""

from typing import Literal, Optional

from pydantic import BaseModel, Field

Vertical = Literal[
    "space-defence",
    "energy-climate",
    "semis-computing",
    "advanced-manufacturing",
    "healthtech",
    "out_of_scope",
]

Subsector = Literal[
    "launch", "satellites-eo", "space-propulsion", "drones", "defence-electronics",
    "batteries", "hydrogen", "fusion-plasma", "solar-materials", "ccus", "grid-tech",
    "chip-design", "fabs-osat", "photonics", "quantum",
    "robotics", "advanced-materials", "3d-printing", "industrial-iot",
    "ai-diagnostics", "medical-devices", "biotech", "genomics", "digital-therapeutics",
    "none",
]


class ExtractedInvestor(BaseModel):
    name: str
    is_lead: bool


class ExtractedDeal(BaseModel):
    company: str = Field(description="Company name as written, without legal suffixes like Pvt Ltd")
    company_description: str = Field(description="One plain sentence on what the company builds")
    city: Optional[str] = Field(description="Indian city of the company's headquarters, if stated")
    announced_on: Optional[str] = Field(description="Announcement date, YYYY-MM-DD, if stated")
    kind: Literal["equity", "debt", "grant", "acquisition"]
    stage: Literal["pre-seed", "seed", "A", "B", "C+", "grant", "debt", "acquisition", "unknown"]
    is_undisclosed: bool = Field(description="True if the amount is not stated")
    amount_value: Optional[float] = Field(description="The number as written, e.g. 40 for 'Rs 40 crore'")
    amount_unit: Optional[Literal["crore", "lakh", "billion", "million", "thousand", "units"]]
    currency: Optional[Literal["INR", "USD", "EUR", "GBP", "SGD", "JPY"]]
    investors: list[ExtractedInvestor]
    vertical: Vertical
    subsector: Subsector
    is_adjacent: bool = Field(
        description="True if related to the niche but the company does not build the core technology itself"
    )
    confidence: float = Field(description="0 to 1: confidence that vertical and subsector are right")


class ArticleExtraction(BaseModel):
    deals: list[ExtractedDeal] = Field(
        description="In-scope funding rounds, grants or acquisitions of Indian companies announced in the article"
    )
