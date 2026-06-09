use wasm_bindgen::prelude::*;
use serde::{Deserialize};

#[derive(Deserialize)]
pub struct ActivityData {
    pub category: String,
    pub quantity: f64,
}

#[wasm_bindgen]
pub fn carbon_calc(activity_json: &str) -> f64 {
    let activity: Result<ActivityData, _> = serde_json::from_str(activity_json);
    match activity {
        Ok(data) => {
            // Deterministic arithmetic: apply emission factors independently in WASM
            // Emission factor sources:
            // - IPCC AR6 (transport)
            // - EPA (energy)
            // - DEFRA (food, goods)
            let factor = match data.category.as_str() {
                "transport" => 0.19, // e.g., kg CO2 per km
                "food" => 2.5,       // e.g., kg CO2 per meal
                "energy" => 0.4,     // e.g., kg CO2 per kWh
                "goods" => 15.0,     // e.g., kg CO2 per item
                _ => 1.0,            // fallback
            };
            data.quantity * factor
        },
        Err(_) => -1.0,          // Signal fallback needed
    }
}

// Removed vector_sim and pdf_report to eliminate dead code per audit.
