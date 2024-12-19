const instrukcja = document.getElementById("instrukcja");

function Iopen()
{
	instrukcja.style.display="block";
}

function Iclose()
{
	instrukcja.style.display="none";
}

const neon = document.getElementById("neon");

function lightoff()
{
	neon.style.textShadow = "none";
	
}

function lighton()
{
	neon.style.textShadow = "0 0 5px #fff, 0 0 10px #fff, 0 0 20px #fff, 0 0 40px #faf, 0 0 80px #faf, 0 0 90px #faf, 0 0 100px #faf";
}

function neontoggle()
{
	if(neon.style.textShadow  ===  "none")
	{
		neon(lighton())
	}else
	{
		neon(lightoff())
	}
	
}

neon.addEventListener("click", neontoggle)
