using System.ComponentModel.DataAnnotations;

public enum TeamRole
{
    [Display(Name = "Member")]
    Member = 0,

    [Display(Name = "Team Admin")]
    TeamAdmin = 1,

    [Display(Name = "Owner")]
    Owner = 2
}
