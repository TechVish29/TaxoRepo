import { RequestHandler } from "express";
import { SavePlatformRulesRequest, GetPlatformRulesResponse, PlatformRuleSet } from "@shared/api";

// Mock storage for platform rule sets
let platformRuleSets: PlatformRuleSet[] = [
  {
    platform: "Snapchat",
    rules: [],
    tokenPositions: [
      {
        id: "1", position: 0, name: "Brand", description: "Brand identifier (e.g., mny)",
        required: true, allowedValues: ["mny", "brand_a", "brand_b", "corp"],
        separator: "_", synonyms: {}, conditionalRules: []
      },
      {
        id: "2", position: 1, name: "Category", description: "Campaign category (e.g., make)",
        required: true, allowedValues: ["make", "grow", "retain", "acquire"],
        separator: "_", synonyms: {}, conditionalRules: []
      },
      {
        id: "3", position: 2, name: "Group", description: "Target group or segment (e.g., others)",
        required: true, allowedValues: ["others", "youth", "adults", "families", "professionals"],
        separator: "_", synonyms: {}, conditionalRules: []
      },
      {
        id: "4", position: 3, name: "Theme", description: "Campaign theme with context",
        required: true, allowedValues: ["awareness-snapads-mny-equity-ramadan", "conversion-snapads-summer", "brand-snapads-launch"],
        separator: "", synonyms: {}, conditionalRules: []
      },
      {
        id: "5", position: 4, name: "Period", description: "Time period code (e.g., 0225 for Feb 25)",
        required: true, allowedValues: ["0125", "0225", "0325", "0425", "0525", "0625"],
        separator: "", synonyms: {}, conditionalRules: []
      },
      {
        id: "6", position: 5, name: "Market", description: "Market/country code (e.g., sa for Saudi Arabia)",
        required: true, allowedValues: ["sa", "ae", "us", "uk", "ca", "au"],
        separator: "_", synonyms: { "sa": ["saudi"], "ae": ["uae"], "us": ["usa"] }, conditionalRules: []
      },
      {
        id: "7", position: 6, name: "Buy Type", description: "Buying method (e.g., auction)",
        required: true, allowedValues: ["auction", "reserved", "preferred", "programmatic"],
        separator: "_", synonyms: {}, conditionalRules: []
      },
      {
        id: "8", position: 7, name: "Objective", description: "Campaign objective/optimization",
        required: true, allowedValues: ["aw-awareness", "cv-conversion", "tr-traffic", "en-engagement"],
        separator: "_", synonyms: {}, conditionalRules: []
      },
      {
        id: "9", position: 8, name: "Placement", description: "Ad placement type (e.g., content)",
        required: true, allowedValues: ["content", "stories", "discover", "spotlight"],
        separator: "_", synonyms: {}, conditionalRules: []
      }
    ]
  },
  {
    platform: "Google Ads",
    rules: [],
    tokenPositions: [
      {
        id: "1",
        position: 0,
        name: "Date/Quarter",
        description: "Campaign timing identifier for Google Ads",
        required: true,
        allowedValues: ["Q1_2024", "Q2_2024", "Q3_2024", "Q4_2024", "2024", "2025"],
        separator: "_",
        synonyms: {
          "Q1": ["Quarter1", "Q1_24"],
          "Q4": ["Quarter4", "Q4_24", "Holiday"]
        },
        conditionalRules: []
      },
      {
        id: "2",
        position: 1,
        name: "Campaign Type",
        description: "Google Ads campaign type",
        required: true,
        allowedValues: ["Search", "Display", "Shopping", "Video", "Performance_Max"],
        separator: "_",
        synonyms: {
          "Search": ["SEM", "PPC", "Paid_Search"],
          "Display": ["Banner", "GDN", "Display_Network"],
          "Shopping": ["PLAs", "Product_Listing"]
        },
        conditionalRules: []
      },
      {
        id: "3",
        position: 2,
        name: "Geographic Target",
        description: "Target geographic location",
        required: true,
        allowedValues: ["US", "UK", "CA", "AU", "Global", "EMEA", "APAC"],
        separator: "_",
        synonyms: {
          "US": ["USA", "United_States"],
          "UK": ["United_Kingdom", "GB"]
        },
        conditionalRules: []
      }
    ]
  },
  {
    platform: "Facebook Ads",
    rules: [],
    tokenPositions: [
      {
        id: "1",
        position: 0,
        name: "Date/Quarter",
        description: "Campaign timing for Facebook",
        required: true,
        allowedValues: ["Q1_2024", "Q2_2024", "Q3_2024", "Q4_2024", "2024", "2025"],
        separator: "_",
        synonyms: {},
        conditionalRules: []
      },
      {
        id: "2",
        position: 1,
        name: "Campaign Objective",
        description: "Facebook campaign objective",
        required: true,
        allowedValues: ["Traffic", "Conversions", "Lead_Generation", "Brand_Awareness", "Reach", "Video_Views"],
        separator: "_",
        synonyms: {
          "Traffic": ["Link_Clicks", "Website_Traffic"],
          "Conversions": ["Purchase", "Sales"],
          "Lead_Generation": ["Lead_Gen", "Leads"]
        },
        conditionalRules: []
      },
      {
        id: "3",
        position: 2,
        name: "Audience",
        description: "Target audience segment",
        required: false,
        allowedValues: ["Lookalike", "Interest", "Custom", "Broad", "Retargeting"],
        separator: "_",
        synonyms: {
          "Retargeting": ["Remarketing", "Website_Visitors"]
        },
        conditionalRules: []
      }
    ]
  },
  {
    platform: "TikTok Ads",
    rules: [],
    tokenPositions: [
      {
        id: "1", position: 0, name: "Brand Code", description: "3-character brand abbreviation (lowercase)",
        required: true, allowedValues: ["cer", "lrp", "gar", "vic", "oap", "lp"],
        separator: "_", synonyms: {}, conditionalRules: []
      },
      {
        id: "2", position: 1, name: "Category Code", description: "4-character product category identifier (lowercase)",
        required: true, allowedValues: ["skfc", "haca", "skin", "multi", "make", "haco"],
        separator: "_", synonyms: {}, conditionalRules: []
      },
      {
        id: "3", position: 2, name: "Subcategory/Product", description: "Product-specific identifier or campaign type",
        required: true, allowedValues: ["cer-cer", "lrp-eff", "vic-m89", "other-advocacy", "other-glyco"],
        separator: "_", synonyms: {}, conditionalRules: []
      },
      {
        id: "4", position: 3, name: "Campaign Description", description: "Campaign name with date marker: [campaignname]-[MMYY][region]-[details]",
        required: true, allowedValues: ["effaclarcleanser-0725sa-x", "vitaminc-0625ae-launch", "antiaging-0825kw-promo"],
        separator: "_", synonyms: {
          "sa": ["saudi", "saudiarabia"],
          "ae": ["uae", "emirates"],
          "kw": ["kuwait"],
          "lb": ["lebanon"]
        }, conditionalRules: []
      },
      {
        id: "5", position: 4, name: "Funnel Stage", description: "Funnel stage indicator",
        required: true, allowedValues: ["auc", "res"],
        separator: "_", synonyms: {
          "auc": ["auction"],
          "res": ["reservation"]
        }, conditionalRules: []
      },
      {
        id: "6", position: 5, name: "Campaign Objective", description: "Campaign objective specification",
        required: true, allowedValues: ["aw-video-views", "aw-reach", "cons-traffic", "cons-engagement"],
        separator: "_", synonyms: {}, conditionalRules: []
      },
      {
        id: "7", position: 6, name: "Additional Parameters", description: "Campaign type indicators or targeting info",
        required: false, allowedValues: ["alwayson", "other", "x", "lla"],
        separator: "_", synonyms: {
          "lla": ["lookalike"]
        }, conditionalRules: []
      },
      {
        id: "8", position: 7, name: "Reserved Field", description: "Reserved field, usually 'x' when not used",
        required: false, allowedValues: ["x"],
        separator: "_", synonyms: {}, conditionalRules: []
      },
      {
        id: "9", position: 8, name: "Campaign ID", description: "Format: ym followed by 8 digits (e.g., ym00479511)",
        required: true, allowedValues: ["ym00479511", "ym00444778", "ym12345678"],
        separator: "", synonyms: {
          "ym": ["YM"]
        }, conditionalRules: []
      }
    ]
  },
  {
    platform: "LinkedIn Ads",
    rules: [],
    tokenPositions: [
      {
        id: "1", position: 0, name: "Date/Quarter", description: "Campaign timing for LinkedIn",
        required: true, allowedValues: ["Q1_2024", "Q2_2024", "Q3_2024", "Q4_2024", "2024", "2025"],
        separator: "_", synonyms: {}, conditionalRules: []
      },
      {
        id: "2", position: 1, name: "Campaign Type", description: "LinkedIn campaign type",
        required: true, allowedValues: ["Sponsored_Content", "Message_Ads", "Dynamic_Ads", "Text_Ads", "Lead_Gen_Forms"],
        separator: "_", synonyms: {
          "Sponsored_Content": ["Single_Image", "Carousel", "Video"],
          "Message_Ads": ["InMail", "Conversation_Ads"]
        }, conditionalRules: []
      },
      {
        id: "3", position: 2, name: "Target Audience", description: "Professional audience targeting",
        required: true, allowedValues: ["C_Level", "IT_Decision_Makers", "HR_Professionals", "Marketing_Managers", "Sales_Professionals"],
        separator: "_", synonyms: {}, conditionalRules: []
      }
    ]
  },
  {
    platform: "Twitter Ads",
    rules: [],
    tokenPositions: [
      {
        id: "1", position: 0, name: "Date/Quarter", description: "Campaign timing for Twitter",
        required: true, allowedValues: ["Q1_2024", "Q2_2024", "Q3_2024", "Q4_2024", "2024", "2025"],
        separator: "_", synonyms: {}, conditionalRules: []
      },
      {
        id: "2", position: 1, name: "Campaign Objective", description: "Twitter campaign objective",
        required: true, allowedValues: ["Awareness", "Tweet_Engagements", "Video_Views", "Website_Clicks", "App_Installs", "Followers"],
        separator: "_", synonyms: {
          "Website_Clicks": ["Traffic", "Link_Clicks"],
          "Tweet_Engagements": ["Engagement", "Interactions"]
        }, conditionalRules: []
      },
      {
        id: "3", position: 2, name: "Geographic Target", description: "Target market",
        required: true, allowedValues: ["US", "UK", "CA", "AU", "Global", "EMEA", "APAC"],
        separator: "_", synonyms: {}, conditionalRules: []
      }
    ]
  },
  {
    platform: "YouTube Ads",
    rules: [],
    tokenPositions: [
      {
        id: "1", position: 0, name: "Date/Quarter", description: "Campaign timing for YouTube",
        required: true, allowedValues: ["Q1_2024", "Q2_2024", "Q3_2024", "Q4_2024", "2024", "2025"],
        separator: "_", synonyms: {}, conditionalRules: []
      },
      {
        id: "2", position: 1, name: "Video Campaign Type", description: "YouTube video campaign type",
        required: true, allowedValues: ["Skippable_In_Stream", "Non_Skippable", "Bumper", "Discovery", "Shorts"],
        separator: "_", synonyms: {
          "Discovery": ["In_Feed", "YouTube_Search"],
          "Skippable_In_Stream": ["TrueView", "In_Stream"]
        }, conditionalRules: []
      },
      {
        id: "3", position: 2, name: "Geographic Target", description: "Target market",
        required: true, allowedValues: ["US", "UK", "CA", "AU", "Global", "EMEA", "APAC"],
        separator: "_", synonyms: {}, conditionalRules: []
      }
    ]
  }
];

export const handleSavePlatformRules: RequestHandler = (req, res) => {
  try {
    const { platform, rules, tokenPositions }: SavePlatformRulesRequest = req.body;

    if (!platform || !tokenPositions) {
      return res.status(400).json({ error: "Platform and token positions are required" });
    }

    // Remove existing rules for this platform
    platformRuleSets = platformRuleSets.filter(rs => rs.platform !== platform);
    
    // Add new rules
    platformRuleSets.push({
      platform,
      rules: rules || [],
      tokenPositions
    });

    res.json({ 
      success: true, 
      message: `Rules saved for ${platform}`,
      platform,
      rulesCount: tokenPositions.length
    });
  } catch (error) {
    console.error("Save platform rules error:", error);
    res.status(500).json({ error: "Failed to save platform rules" });
  }
};

export const handleGetPlatformRules: RequestHandler = (req, res) => {
  try {
    const platforms = platformRuleSets.map(rs => rs.platform);
    
    const response: GetPlatformRulesResponse = {
      platforms,
      ruleSets: platformRuleSets
    };

    res.json(response);
  } catch (error) {
    console.error("Get platform rules error:", error);
    res.status(500).json({ error: "Failed to get platform rules" });
  }
};

export const handleGetSpecificPlatformRules: RequestHandler = (req, res) => {
  try {
    const { platform } = req.params;
    
    const ruleSet = platformRuleSets.find(rs => rs.platform === platform);
    
    if (!ruleSet) {
      return res.status(404).json({ error: `No rules found for platform: ${platform}` });
    }

    res.json(ruleSet);
  } catch (error) {
    console.error("Get specific platform rules error:", error);
    res.status(500).json({ error: "Failed to get platform rules" });
  }
};
