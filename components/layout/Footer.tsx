import Link from "next/link";

export function Footer() {
  return (
      <footer className="w-full flex items-center justify-center py-3 px-4 fixed bottom-0 bg-background border-t">
        <Link
          className="flex flex-col sm:flex-row items-center gap-1 text-current text-center sm:text-left text-sm"
          href="https://tiplink.io/blinks/donate?dest=D2yGetspd22V3UFHTudRN1s7bU6DF7JNaLBCn2NQ2KHd"
        >
          <span className="text-muted-foreground">Made with ❤️ by GeekLad</span>
          <span className="text-primary underline hover:text-primary/80 transition-colors">Buy him a coffee or a lambo</span>
        </Link>
      </footer>    
  );
}
