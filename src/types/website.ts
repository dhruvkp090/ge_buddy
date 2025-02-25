export interface Website {
  url: string;
  limitType?: LimitType;
}

export type LimitType = "time" | "video";

export interface WebsiteCategories {
  fun: Website[];
  funAndWork: Website[];
  socialMedia: Website[];
}

export interface TimerSettings {
  waitTime: number;
  accessDuration: number;
  maxVideoChanges?: number;
  defaultLimitType: LimitType;
}

export interface CategorySettings {
  fun: TimerSettings;
  funAndWork: {
    fun: TimerSettings;
    work: TimerSettings;
  };
  socialMedia: TimerSettings;
}
