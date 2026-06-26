import Link from "next/link";
import {
  XLogo,
  DiscordLogo,
  TelegramLogo,
  GitHubLogo,
} from "@/components/icons";

export function Footer() {
  return (
      <footer className="w-full flex items-center justify-center py-3 px-4 fixed bottom-0 bg-background border-t">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left text-sm">
          <Link
            className="flex flex-col sm:flex-row items-center gap-1 text-current"
            href="https://tiplink.io/blinks/donate?dest=D2yGetspd22V3UFHTudRN1s7bU6DF7JNaLBCn2NQ2KHd"
          >
            <span className="text-muted-foreground">Made with ❤️ by GeekLad</span>
            <span className="text-primary underline hover:text-primary/80 transition-colors">Buy him a coffee or a lambo</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <Link
              href="https://x.com/OpenLaunchApp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="X (Twitter)"
            >
              <XLogo className="w-5 h-5" />
            </Link>
            
            <Link
              href="https://discord.gg/XF83PypJDh"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Discord"
            >
              <DiscordLogo className="w-5 h-5" />
            </Link>
            
            <Link
              href="https://t.me/OpenLaunch"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Telegram"
            >
              <TelegramLogo className="w-5 h-5" />
            </Link>
            
            <Link
              href="https://github.com/GeekLad/OpenLaunch"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <GitHubLogo className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </footer>    
  );
}
