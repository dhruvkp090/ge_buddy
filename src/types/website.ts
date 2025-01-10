export interface Website {
  url: string;
}

export interface WebsiteCategories {
  fun: Website[];
  funAndWork: Website[];
  socialMedia: Website[];
}

export interface TimerSettings {
  waitTime: number;
  accessDuration: number;
}

export interface CategorySettings {
  fun: TimerSettings;
  funAndWork: {
    fun: TimerSettings;
    work: TimerSettings;
  };
  socialMedia: TimerSettings;
}
